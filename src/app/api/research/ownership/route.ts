import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { computeOwnershipFlags, type OwnershipRow } from "@/lib/research/ownership";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { getText } from "@/lib/collector/http";
import { masterToRows, parseShpXbrl } from "@/lib/collector/shareholding";
import { NextResponse } from "next/server";

export const revalidate = 900;

const CACHE = "public, s-maxage=21600, stale-while-revalidate=1800"; // 6 hours — filings are quarterly
const NSE_SHP = "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern";

type Row = {
  broadcast_date: Date | string;
  quarter_end: Date | string | null;
  promoter_pct: string | null;
  fii_pct: string | null;
  dii_pct: string | null;
  public_pct: string | null;
  pledge_pct: string | null;
  shareholder_count: string | number | null;
  xbrl_url: string | null;
};
const num = (v: string | null) => (v === null ? null : Number(v));

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/xml,text/xml,*/*",
  Referer: "https://www.nseindia.com/",
};

const inflight = new Map<string, Promise<void>>();
const settled = new Map<string, number>(); // rows already read (or failed) recently: never re-fetch in a loop

/**
 * ROOT CAUSE of blank institution / pledge figures: the collector reads each filing's XBRL only within a
 * per-run budget, so many stocks hold promoter/public % from NSE's list but no foreign / domestic / pledge detail.
 * Fill the newest filings on demand from the filing's own XBRL (free, deterministic), write them back, and
 * remember the outcome for 6 hours so a bad file is not retried in a loop.
 */
async function backfillDetail(symbol: string, rows: Row[]): Promise<void> {
  const need = rows.filter((r) => r.xbrl_url && r.fii_pct === null && (settled.get(`${symbol}|${toDateString(r.broadcast_date)}`) ?? 0) < Date.now()).slice(0, 4);
  await Promise.all(
    need.map((r) => {
      const day = toDateString(r.broadcast_date);
      const key = `${symbol}|${day}`;
      const existing = inflight.get(key);
      if (existing) return existing;
      const run = (async () => {
        try {
          const d = parseShpXbrl(await getText(r.xbrl_url!, { headers: BROWSER_HEADERS, timeoutMs: 12_000, attempts: 1 }));
          if (d.fiiPct === null && d.diiPct === null) throw new Error("no institution facts in filing");
          await sql()`UPDATE shareholding SET fii_pct = ${d.fiiPct}, dii_pct = ${d.diiPct}, pledge_pct = COALESCE(pledge_pct, ${d.pledgePct}), shareholder_count = COALESCE(shareholder_count, ${d.shareholderCount}), quarter_end = COALESCE(quarter_end, ${d.quarterEnd}) WHERE symbol = ${symbol} AND broadcast_date = ${day}`;
          r.fii_pct = d.fiiPct === null ? null : String(d.fiiPct);
          r.dii_pct = d.diiPct === null ? null : String(d.diiPct);
          r.pledge_pct = r.pledge_pct ?? (d.pledgePct === null ? null : String(d.pledgePct));
          r.shareholder_count = r.shareholder_count ?? d.shareholderCount;
        } catch {
          /* keep the master-only row */
        } finally {
          settled.set(key, Date.now() + 6 * 3600_000);
          inflight.delete(key);
        }
      })();
      inflight.set(key, run);
      return run;
    }),
  );
}

/** "none" = no promoter group is registered (professionally managed, e.g. HDFC Bank, ITC, Eternal); that is a fact, not a data gap. */
function promoterStatus(latest: OwnershipRow | undefined, series: OwnershipRow[]): "present" | "none" | "unknown" {
  if (!latest || latest.promoterPct === null) return "unknown";
  if (latest.promoterPct > 0) return "present";
  return series.filter((p) => p.promoterPct === 0).length >= 2 || series.length <= 1 ? "none" : "present";
}

async function fetchLiveOwnership(symbol: string): Promise<OwnershipRow[]> {
  try {
    type MasterRow = {
      broadcastDate?: string | null;
      date?: string | null;
      pr_and_prgrp?: string | null;
      public_val?: string | null;
      xbrl?: string | null;
    };
    const master = await nseJson<MasterRow[]>(
      `/api/corporate-share-holdings-master?index=equities&symbol=${encodeURIComponent(symbol)}`,
    );
    if (!Array.isArray(master) || !master.length) return [];
    const filings = masterToRows(symbol, master);
    if (!filings.length) return [];

    // Read the newest filings' XBRL (in parallel) for foreign / domestic institutions, pledge and holder count.
    await Promise.all(
      filings.slice(0, 5).map(async (f) => {
        if (!f.xbrlUrl) return;
        try {
          const res = await fetch(f.xbrlUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15_000) });
          if (!res.ok) return;
          const detail = parseShpXbrl(await res.text());
          f.quarterEnd = detail.quarterEnd ?? f.quarterEnd;
          f.promoterPct = f.promoterPct ?? detail.promoterPct;
          f.publicPct = detail.publicPct ?? f.publicPct;
          f.fiiPct = detail.fiiPct;
          f.diiPct = detail.diiPct;
          f.pledgePct = detail.pledgePct;
          f.shareholderCount = detail.shareholderCount;
        } catch {
          // keep master data for this quarter
        }
      }),
    );

    return filings
      .slice(0, 9)
      .map((f) => ({
        broadcastDate: f.broadcastDate,
        quarterEnd: f.quarterEnd,
        promoterPct: f.promoterPct,
        fiiPct: f.fiiPct,
        diiPct: f.diiPct,
        publicPct: f.publicPct,
        pledgePct: f.pledgePct,
        shareholderCount: f.shareholderCount,
        xbrlUrl: f.xbrlUrl,
      }))
      .reverse();
  } catch {
    return [];
  }
}

/**
 * GET /api/research/ownership?symbol=RELIANCE
 * Latest shareholding breakdown, last-8-quarters series and deterministic
 * risk flags (pledge > 20%, pledge +5pp QoQ, promoter holding −2pp QoQ).
 * Dates are NSE filing dates; every flag links its filing.
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  const nseUrl = `${NSE_SHP}?symbol=${encodeURIComponent(symbol)}`;
  const empty = { symbol, latest: null, series: [], flags: [], nseUrl };

  let asc: OwnershipRow[] = [];

  if (hasDatabase()) {
    try {
      await ensureSchema();
      const rows = (await sql()`
        SELECT broadcast_date, quarter_end, promoter_pct, fii_pct, dii_pct, public_pct, pledge_pct, shareholder_count, xbrl_url
        FROM shareholding WHERE symbol = ${symbol} ORDER BY broadcast_date DESC LIMIT 9
      `) as Row[];

      if (rows.length > 0) {
        await Promise.race([backfillDetail(symbol, rows), new Promise((r) => setTimeout(r, 14_000))]);
        asc = rows
          .map((r) => ({
            broadcastDate: toDateString(r.broadcast_date),
            quarterEnd: r.quarter_end ? toDateString(r.quarter_end) : null,
            promoterPct: num(r.promoter_pct),
            fiiPct: num(r.fii_pct),
            diiPct: num(r.dii_pct),
            publicPct: num(r.public_pct),
            pledgePct: num(r.pledge_pct),
            shareholderCount: r.shareholder_count === null ? null : Number(r.shareholder_count),
            xbrlUrl: r.xbrl_url,
          }))
          .reverse();
      }
    } catch {
      // fallback to live
    }
  }

  // If no DB rows found, fetch live from NSE official API
  if (asc.length === 0) {
    asc = await fetchLiveOwnership(symbol);
  }

  if (asc.length === 0) {
    return NextResponse.json({ ...empty, dbConfigured: hasDatabase() }, { headers: { "Cache-Control": CACHE } });
  }

  const last8 = asc.slice(-8);
  const cutoff = last8[0]?.broadcastDate ?? "";
  return NextResponse.json(
    {
      symbol,
      dbConfigured: hasDatabase(),
      latest: asc[asc.length - 1] ?? null,
      promoterStatus: promoterStatus(asc[asc.length - 1], last8),
      series: last8.map((r) => ({
        broadcastDate: r.broadcastDate,
        quarterEnd: r.quarterEnd,
        promoterPct: r.promoterPct,
        fiiPct: r.fiiPct,
        diiPct: r.diiPct,
        publicPct: r.publicPct,
        pledgePct: r.pledgePct,
        shareholderCount: r.shareholderCount,
        xbrlUrl: r.xbrlUrl,
      })),
      flags: computeOwnershipFlags(asc).filter((f) => f.broadcastDate >= cutoff),
      nseUrl,
    },
    { headers: { "Cache-Control": CACHE } },
  );
}
