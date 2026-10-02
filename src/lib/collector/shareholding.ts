import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { getText, today } from "./http";
import type { Collector, CollectorContext, RecordBatch, SeriesResult } from "./types";

/**
 * Promoter / institution / pledge ownership from NSE shareholding patterns.
 * Step 1 (cheap, per symbol): the master list gives every filing's broadcastDate
 * (the event time — never estimated from quarter-end) plus promoter/public %.
 * Step 2 (only for filings not yet ingested): the XBRL gives foreign/domestic
 * institutions, promoter pledge/encumbrance and shareholder count. No ML here —
 * the deterministic risk rules live in the API.
 */

const ID = "shareholding";
const MASTER = (symbol: string) => `/api/corporate-share-holdings-master?index=equities&symbol=${encodeURIComponent(symbol)}`;
const BUDGET_MS = Number(process.env.SHAREHOLDING_BUDGET_MS ?? 8 * 60_000);
const XBRL_CAP = Number(process.env.SHAREHOLDING_XBRL_CAP ?? 300);
const FIRST_SIGHT_FILINGS = 8; // last 8 quarters for the sparklines
const PAUSE_MS = 450;

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/xml,text/xml,*/*",
  Referer: "https://www.nseindia.com/",
};

type MasterRow = {
  broadcastDate?: string | null;
  date?: string | null;
  pr_and_prgrp?: string | null;
  public_val?: string | null;
  xbrl?: string | null;
};

export type ShareholdingRow = {
  symbol: string;
  broadcastDate: string; // YYYY-MM-DD (IST)
  quarterEnd: string | null;
  promoterPct: number | null;
  fiiPct: number | null;
  diiPct: number | null;
  publicPct: number | null;
  pledgePct: number | null;
  shareholderCount: number | null;
  xbrlUrl: string | null;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "16-JUL-2026 19:24:44" / "30-JUN-2026" → "2026-07-16" (the date as NSE prints it, IST). */
export function parseNseDay(s: string | null | undefined): string | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})/.exec((s ?? "").trim());
  if (!m) return null;
  const mi = MONTHS.indexOf(m[2].toUpperCase());
  return mi < 0 ? null : `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

const pctNum = (v: string | null | undefined): number | null => {
  const n = Number((v ?? "").replace(/,/g, ""));
  return v != null && v.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
};

export type ShpDetail = {
  quarterEnd: string | null;
  promoterPct: number | null;
  fiiPct: number | null;
  diiPct: number | null;
  publicPct: number | null;
  pledgePct: number | null;
  shareholderCount: number | null;
};

/** Flat-fact reader for the BSE/NSE "SHP" XBRL: <in-bse-shp:Name contextRef="X">value</…>. No XML library needed. */
export function parseShpXbrl(xml: string): ShpDetail {
  const facts = new Map<string, string>();
  for (const m of xml.matchAll(/<in-bse-shp:([A-Za-z0-9]+) contextRef="([^"]+)"[^>]*>([^<]*)</g)) facts.set(`${m[1]}|${m[2]}`, m[3].trim());
  const fact = (name: string, ctx: string) => facts.get(`${name}|${ctx}`) ?? null;
  const frac = (name: string, ctx: string) => {
    const v = fact(name, ctx);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 1 ? Math.round(n * 10_000) / 100 : null; // fractions → % (4dp source ⇒ 2dp %)
  };
  const PROMOTER = "ShareholdingOfPromoterAndPromoterGroup_ContextI";
  const pledged =
    frac("EncumberedSharesHeldAsPercentageOfTotalNumberOfShares", PROMOTER) ??
    frac("EncumberedShareUnderPledgedAsPercentageOfTotalNumberOfShares", PROMOTER);
  // No encumbrance facts: only call it 0 when the filing explicitly says nothing is pledged/encumbered, else unknown.
  const flags = ["WhetherAnySharesHeldByPromotersAreEncumberedUnderPledged", "WhetherAnySharesHeldByPromotersAreEncumberedUnderNonDisposalUndertaking", "WhetherAnySharesHeldByPromotersAreEncumberedOtherThanByWayOfPledgeOrNDU"].map((n) => fact(n, "MainI"));
  const noneEncumbered = flags.every((f) => f === "false");
  const count = Number(fact("NumberOfShareholders", "ShareholdingPattern_ContextI"));
  return {
    quarterEnd: fact("DateOfReport", "MainI")?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0] ?? null,
    promoterPct: frac("ShareholdingAsAPercentageOfTotalNumberOfShares", PROMOTER),
    fiiPct: frac("ShareholdingAsAPercentageOfTotalNumberOfShares", "InstitutionsForeign_ContextI"),
    diiPct: frac("ShareholdingAsAPercentageOfTotalNumberOfShares", "InstitutionsDomestic_ContextI"),
    publicPct: frac("ShareholdingAsAPercentageOfTotalNumberOfShares", "PublicShareholding_ContextI"),
    pledgePct: pledged ?? (noneEncumbered ? 0 : null),
    shareholderCount: Number.isInteger(count) && count > 0 ? count : null,
  };
}

/** Master rows → ingest rows (newest first). Rows without a parseable broadcast date are dropped, never dated by guess. */
export function masterToRows(symbol: string, master: MasterRow[]): ShareholdingRow[] {
  const out: ShareholdingRow[] = [];
  for (const m of master) {
    const broadcastDate = parseNseDay(m.broadcastDate);
    if (!broadcastDate) continue;
    out.push({
      symbol,
      broadcastDate,
      quarterEnd: parseNseDay(m.date),
      promoterPct: pctNum(m.pr_and_prgrp),
      fiiPct: null,
      diiPct: null,
      publicPct: pctNum(m.public_val),
      pledgePct: null,
      shareholderCount: null,
      xbrlUrl: m.xbrl?.trim() || null,
    });
  }
  return out.sort((a, b) => (a.broadcastDate < b.broadcastDate ? 1 : -1));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Weekday slot 0-6 per symbol, so each symbol is re-checked weekly without every run touching all 500. */
const slot = (symbol: string) => [...symbol].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 7, 0);

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const known: Record<string, string> = (await ctx?.watermarks("shareholding:").catch(() => ({}))) ?? {};
  const weekday = new Date().getUTCDay();
  // SHAREHOLDING_SYMBOLS="RELIANCE,TCS" narrows a manual run (testing / targeted backfill).
  const only = (process.env.SHAREHOLDING_SYMBOLS ?? "").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
  const symbols = only.length ? only : NIFTY_500.map((r) => r[0]);
  const unseen = symbols.filter((s) => !known[`shareholding:${s}`]);
  const due = symbols.filter((s) => known[`shareholding:${s}`] && slot(s) === weekday);
  const queue = process.env.SHAREHOLDING_FULL === "1" ? symbols : [...unseen, ...due];

  const deadline = Date.now() + BUDGET_MS;
  const rows: ShareholdingRow[] = [];
  const watermarks: Record<string, string> = {};
  let xbrlFetched = 0;
  let masterFailures = 0;
  let masterOk = 0;
  let processed = 0;

  for (const symbol of queue) {
    if (Date.now() > deadline) break;
    let master: MasterRow[];
    try {
      const raw = await nseJson<MasterRow[]>(MASTER(symbol));
      if (!Array.isArray(raw)) throw new Error("non-array master");
      master = raw;
      masterOk++;
    } catch {
      masterFailures++;
      await sleep(PAUSE_MS);
      continue; // transient per-symbol failure: leave its watermark untouched, retry next run
    }
    await sleep(PAUSE_MS);

    const filings = masterToRows(symbol, master);
    const wm = known[`shareholding:${symbol}`] ?? null;
    // XBRL only for filings newer than the watermark (first sight: the latest 8 quarters).
    const fresh = filings.filter((f) => !wm || f.broadcastDate > wm).slice(0, wm ? 4 : FIRST_SIGHT_FILINGS);
    let complete = true;
    for (const f of fresh) {
      if (!f.xbrlUrl) continue;
      if (xbrlFetched >= XBRL_CAP || Date.now() > deadline) {
        complete = false;
        break;
      }
      try {
        const detail = parseShpXbrl(await getText(f.xbrlUrl, { headers: BROWSER_HEADERS, timeoutMs: 30_000 }));
        xbrlFetched++;
        f.quarterEnd = detail.quarterEnd ?? f.quarterEnd;
        f.promoterPct = f.promoterPct ?? detail.promoterPct;
        f.publicPct = f.publicPct ?? detail.publicPct;
        f.fiiPct = detail.fiiPct;
        f.diiPct = detail.diiPct;
        f.pledgePct = detail.pledgePct;
        f.shareholderCount = detail.shareholderCount;
      } catch {
        complete = false; // keep the master-only row; retried next run because the watermark won't advance
      }
      await sleep(PAUSE_MS);
    }
    // Master-derived rows are always safe to upsert (idempotent); detail only where fetched.
    rows.push(...filings.slice(0, Math.max(fresh.length, FIRST_SIGHT_FILINGS)));
    if (complete && filings[0]) watermarks[`shareholding:${symbol}`] = filings[0].broadcastDate;
    processed++;
  }

  // Honesty: if NSE refused every call we have learned nothing → failure record, not a green run.
  if (queue.length && masterOk === 0) throw new Error(`NSE shareholding master unreachable (${masterFailures} symbol fetches failed)`);

  const batch: RecordBatch = { table: "shareholding", rows: rows as unknown as Record<string, unknown>[], watermarks };
  return [
    {
      id: "shareholding_filings_ingested",
      label: "Shareholding filings read from NSE this run",
      unit: "filings",
      category: "market",
      provider: "NSE India",
      url: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
      obs: [{ date: today(), value: rows.length, meta: { symbolsProcessed: processed, queued: queue.length, xbrlFetched, masterFailures } }],
      records: batch,
    },
  ];
}

export const shareholding: Collector = { id: ID, run, actionsOnly: true, timeoutMs: BUDGET_MS + 120_000 };
