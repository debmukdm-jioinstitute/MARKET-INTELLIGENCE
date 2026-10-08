import { createHash } from "node:crypto";
import { nseJson } from "@/lib/feeds/india/nse-session";
import type { PromoterFeedItem } from "@/lib/promoters/feed-types";

/**
 * Official NSE JSON endpoints (same ones nseindia.com's own pages call) — real
 * exchange filings instead of news-search proxies. Each source is best-effort and
 * independent: one failing never blocks the others.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** "08-Oct-2026" | "08-OCT-2026 to 09-OCT-2026" | "08-Oct-2026 16:31:07" -> "2026-10-08" */
export function nseDateToIso(raw: string | null | undefined): string | null {
  const m = raw?.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const mm = MONTHS[m[2]!.toUpperCase()];
  return mm ? `${m[3]}-${mm}-${m[1]}` : null;
}

function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

function id(...parts: Array<string | null | undefined>): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};
const cr = (rupees: number) => `₹${(rupees / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 1 })} cr`;
const qtyFmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

type SastRow = {
  acquirerName?: string; company?: string; symbol?: string; acqSaleType?: string;
  noOfShareAcq?: string | null; noOfShareSale?: string | null; totAftShare?: string | null;
  promoterType?: string; acquisitionMode?: string; regType?: string; timestamp?: string;
  attachement?: string; acquirerDate?: string; application_no?: string;
};

async function fetchSast(): Promise<PromoterFeedItem[]> {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const j = await nseJson<{ data?: SastRow[] }>(
    `/api/corporate-sast-reg29?index=equities&from_date=${ddmmyyyy(from)}&to_date=${ddmmyyyy(to)}`,
    { timeoutMs: 25_000, attempts: 2 },
  );
  return (j.data ?? []).flatMap((r): PromoterFeedItem[] => {
    const date = nseDateToIso(r.timestamp) ?? nseDateToIso(r.acquirerDate);
    if (!date || !r.symbol) return [];
    const sale = /sale|disposal|pledge invok/i.test(r.acqSaleType ?? "") || (num(r.noOfShareSale) > 0 && !num(r.noOfShareAcq));
    const isPromoter = r.promoterType === "Y";
    const shares = sale ? num(r.noOfShareSale) : num(r.noOfShareAcq);
    const who = r.acquirerName ?? "Acquirer";
    const after = r.totAftShare ? `, holding now ${r.totAftShare}%` : "";
    return [{
      id: id("sast", r.application_no, r.symbol, r.acquirerName, date),
      channel: "NSE disclosures",
      title: `${r.company ?? r.symbol}: ${who} ${sale ? "sold" : "acquired"} ${qtyFmt(shares)} shares (${r.acquisitionMode ?? r.regType ?? "SAST"})${after}`,
      companyName: r.company ?? null,
      symbol: r.symbol,
      category: isPromoter ? (sale ? "PROMOTER_SELLING" : "PROMOTER_BUYING") : "LARGE_SHAREHOLDER_CHANGE",
      transactionDate: date,
      sourceUrl: r.attachement || "https://www.nseindia.com/companies-listing/corporate-filings-regulation-29",
      snippet: `${r.regType ?? "Reg 29"} · ${isPromoter ? "Promoter / PAC" : "Non-promoter"} · ${r.acqSaleType ?? ""}`.trim(),
      collector: "nse-api",
    }];
  });
}

type DealRow = { buySell?: string | null; clientName?: string | null; date?: string; name?: string; qty?: string; symbol?: string; watp?: string | null };

const MIN_BULK_VALUE_INR = 5e7; // ₹5 cr — bulk window is 200+ rows/day, mostly noise below this

async function fetchDeals(): Promise<PromoterFeedItem[]> {
  const j = await nseJson<{ BULK_DEALS_DATA?: DealRow[]; BLOCK_DEALS_DATA?: DealRow[] }>(
    "/api/snapshot-capital-market-largedeal",
    { timeoutMs: 25_000, attempts: 2 },
  );
  const mk = (rows: DealRow[], kind: "BLOCK_DEAL" | "BULK_DEAL") =>
    rows.flatMap((r): PromoterFeedItem[] => {
      const date = nseDateToIso(r.date);
      const qty = num(r.qty);
      const value = qty * num(r.watp);
      if (!date || !r.symbol || !r.buySell || !qty) return [];
      if (kind === "BULK_DEAL" && value < MIN_BULK_VALUE_INR) return [];
      const side = r.buySell.toUpperCase() === "BUY" ? "bought" : "sold";
      return [{
        id: id(kind, r.symbol, r.clientName, r.buySell, date, r.qty),
        channel: "Bulk & block deals",
        title: `${r.name ?? r.symbol}: ${r.clientName ?? "Client"} ${side} ${qtyFmt(qty)} shares @ ₹${r.watp ?? "—"} (${cr(value)} ${kind === "BLOCK_DEAL" ? "block" : "bulk"} deal)`,
        companyName: r.name ?? null,
        symbol: r.symbol,
        category: kind,
        transactionDate: date,
        sourceUrl: "https://www.nseindia.com/market-data/block-deal-watch",
        snippet: null,
        collector: "nse-api",
      }];
    });
  return [...mk(j.BLOCK_DEALS_DATA ?? [], "BLOCK_DEAL"), ...mk(j.BULK_DEALS_DATA ?? [], "BULK_DEAL")];
}

type PledgeRow = {
  comName?: string; broadcastDt?: string; shp?: string; percPromoterHolding?: string;
  percSharesPledged?: string; numSharesPledged?: string;
};

const MIN_PLEDGE_PCT = 10; // only surface meaningful promoter pledges
const MAX_PLEDGE_ITEMS = 40;

async function fetchPledges(): Promise<PromoterFeedItem[]> {
  // ~1 MB / 1.5k rows — parsed once per run in the cron runner, never on a user request.
  const j = await nseJson<{ data?: PledgeRow[] }>("/api/corporate-pledgedata?index=equities", {
    timeoutMs: 30_000,
    attempts: 2,
  });
  return (j.data ?? [])
    .filter((r) => num(r.percSharesPledged) >= MIN_PLEDGE_PCT && r.comName)
    .sort((a, b) => num(b.percSharesPledged) - num(a.percSharesPledged))
    .slice(0, MAX_PLEDGE_ITEMS)
    .flatMap((r): PromoterFeedItem[] => {
      const date = nseDateToIso(r.broadcastDt);
      if (!date) return [];
      return [{
        id: id("pledge", r.comName, r.shp, r.percSharesPledged),
        channel: "Promoter & pledge",
        title: `${r.comName}: ${num(r.percSharesPledged).toFixed(2)}% of shares pledged (promoter holding ${num(r.percPromoterHolding).toFixed(1)}%, as of ${r.shp ?? "latest SHP"})`,
        companyName: r.comName ?? null,
        symbol: null,
        category: "PLEDGE_INCREASE",
        transactionDate: date,
        sourceUrl: "https://www.nseindia.com/companies-listing/corporate-filings-pledged-data",
        snippet: `${qtyFmt(num(r.numSharesPledged))} shares pledged`,
        collector: "nse-api",
      }];
    });
}

type PitFiling = { symbol?: string; companyName?: string; broadcastDateTime?: string; xmlFileName?: string; ixbrl?: string; regulation?: string; typeOfSubmission?: string };

const PIT_LOOKBACK_DAYS = 10;
const PIT_MAX_FILINGS = 60; // XBRL files fetched per run
const PIT_CONCURRENCY = 8;
const MIN_PIT_VALUE_INR = 1e6; // ₹10 lakh — drops ESOP/tiny-lot noise

/** Pull `<ns:Tag contextRef="DisclosureN" ...>value</ns:Tag>` into per-disclosure maps (no XML dep). */
export function parsePitXbrl(xml: string): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  const re = /<in-bse-co:(\w+)\s+contextRef="(Disclosure\d+)"[^>]*>([^<]*)<\/in-bse-co:\1>/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) (out[m[2]!] ??= {})[m[1]!] = m[3]!.trim();
  return out;
}

function pitCategory(txType: string, personCat: string): PromoterFeedItem["category"] {
  const t = txType.toLowerCase();
  const promoter = /promoter/i.test(personCat);
  if (t.includes("revoke")) return "PLEDGE_DECREASE";
  if (t.includes("pledge")) return "PLEDGE_INCREASE";
  if (/sell|dispos|invoke/.test(t)) return promoter ? "PROMOTER_SELLING" : "INSIDER_SELLING";
  if (/buy|acqui|allot/.test(t)) return promoter ? "PROMOTER_BUYING" : "INSIDER_BUYING";
  return "DISCLOSURE";
}

async function mapLimit<T, R>(arr: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(arr.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, arr.length) }, async () => {
      while (i < arr.length) {
        const k = i++;
        out[k] = await fn(arr[k]!);
      }
    }),
  );
  return out;
}

/**
 * Insider trading (SEBI PIT, Reg 7). `/api/corporates-pit` date-range search is frozen at May 2026, but the
 * page's live feed `/api/corporates-pit-gg` is current: it lists new filings with a public XBRL file holding
 * the actual transaction (person, buy/sell, qty, value, post-holding %). We read only the newest filings.
 */
async function fetchInsider(): Promise<PromoterFeedItem[]> {
  const j = await nseJson<{ data?: PitFiling[] }>("/api/corporates-pit-gg?index=equities", {
    timeoutMs: 25_000,
    attempts: 2,
  });
  const cutoff = Date.now() - PIT_LOOKBACK_DAYS * 86_400_000;
  const filings = (j.data ?? [])
    .filter((f) => f.xmlFileName && f.symbol && f.typeOfSubmission !== "Revised")
    .map((f) => ({ f, iso: nseDateToIso(f.broadcastDateTime) }))
    .filter((x) => x.iso && Date.parse(x.iso) >= cutoff)
    .sort((a, b) => b.iso!.localeCompare(a.iso!))
    .slice(0, PIT_MAX_FILINGS);

  const parsed = await mapLimit(filings, PIT_CONCURRENCY, async ({ f, iso }) => {
    try {
      const res = await fetch(f.xmlFileName!, {
        // nsearchives resets connections for non-browser UAs (verified); keep the timeout tight so a bad file can't stall the run.
        headers: { "User-Agent": BROWSER_UA },
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) return [];
      const discl = parsePitXbrl(await res.text());
      return Object.entries(discl).flatMap(([key, d]): PromoterFeedItem[] => {
        const qty = num(d.SecuritiesAcquiredOrDisposedNumberOfSecurity);
        const value = num(d.SecuritiesAcquiredOrDisposedValueOfSecurity);
        const txType = d.SecuritiesAcquiredOrDisposedTransactionType ?? "";
        const cat = pitCategory(txType, d.CategoryOfPerson ?? "");
        if (!qty || value < MIN_PIT_VALUE_INR || cat === "DISCLOSURE") return [];
        const post = d.SecuritiesHeldPostAcquistionOrDisposalPercentageOfShareholding;
        const verb = /sell|dispos|invoke/i.test(txType) ? "sold" : /pledge/i.test(txType) ? "pledged" : /revoke/i.test(txType) ? "released from pledge" : "bought";
        return [{
          id: id("pit", f.symbol, d.NameOfThePerson, f.broadcastDateTime, key, String(qty)),
          channel: "NSE disclosures",
          title: `${f.companyName ?? f.symbol}: ${d.CategoryOfPerson ?? "Insider"} ${d.NameOfThePerson ?? ""} ${verb} ${qtyFmt(qty)} shares (${cr(value)})${post ? `, holding now ${(num(post) * 100).toFixed(2)}%` : ""}`.replace(/\s+/g, " "),
          companyName: f.companyName ?? null,
          symbol: f.symbol ?? null,
          category: cat,
          transactionDate: iso!,
          sourceUrl: f.ixbrl ?? f.xmlFileName!,
          snippet: `SEBI PIT ${f.regulation ?? "Reg 7"} · ${d.CategoryOfPerson ?? ""}`.trim(),
          collector: "nse-api",
        }];
      });
    } catch {
      return [];
    }
  });
  return parsed.flat();
}

type BseAnn = { SCRIP_CD?: number | string; SLONGNAME?: string; NEWSSUB?: string; HEADLINE?: string; NEWS_DT?: string; ATTACHMENTNAME?: string; NSURL?: string; NEWSID?: string; CATEGORYNAME?: string };

/**
 * BSE corporate announcements (Insider Trading / SAST category). BSE's API sits behind Akamai and rejects many
 * IPs (403 from residential/dev machines); it is tried best-effort with browser headers and simply reports itself
 * as failed when blocked, so a block never degrades the other sources.
 */
async function fetchBse(): Promise<PromoterFeedItem[]> {
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86_400_000);
  const url =
    "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?pageno=1&strCat=Insider%20Trading%20%2F%20SAST&subcategory=-1" +
    `&strPrevDate=${ymd(from)}&strToDate=${ymd(to)}&strSearch=P&strscrip=&strType=C`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.bseindia.com/",
      Origin: "https://www.bseindia.com",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`BSE HTTP ${res.status}`);
  const j = (await res.json()) as { Table?: BseAnn[] };
  return (j.Table ?? []).flatMap((r): PromoterFeedItem[] => {
    const date = r.NEWS_DT?.slice(0, 10);
    const headline = (r.HEADLINE || r.NEWSSUB || "").replace(/\s+/g, " ").trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || headline.length < 15) return [];
    // The "Insider Trading / SAST" bucket is mostly trading-window-closure boilerplate — keep only real trades/holdings.
    if (/trading window|closure of|designated person.*list|code of conduct|structured digital/i.test(headline)) return [];
    if (!/pledge|encumb|regulation 29|reg(ulation)?\.? ?(7|31|29)|sast|acquisition|disposal|acquire|dispos|sale of|purchase|stake|shareholding|takeover/i.test(headline)) return [];
    const category = (() => {
      const t = headline.toLowerCase();
      if (/pledge|encumb/.test(t)) return /releas|revok/.test(t) ? "PLEDGE_DECREASE" : "PLEDGE_INCREASE";
      if (/regulation 29|sast|acquisition|takeover/.test(t)) return "LARGE_SHAREHOLDER_CHANGE";
      return "DISCLOSURE";
    })() as PromoterFeedItem["category"];
    return [{
      id: id("bse", r.NEWSID, String(r.SCRIP_CD ?? ""), headline, date),
      channel: "BSE disclosures",
      title: `${r.SLONGNAME ?? r.SCRIP_CD}: ${headline}`,
      companyName: r.SLONGNAME ?? null,
      symbol: null,
      category,
      transactionDate: date,
      sourceUrl: r.NSURL || (r.ATTACHMENTNAME ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${r.ATTACHMENTNAME}` : "https://www.bseindia.com/corporates/ann.html"),
      snippet: r.CATEGORYNAME ?? null,
      collector: "native",
    }];
  });
}

export type NativeResult = { items: PromoterFeedItem[]; failed: string[] };

/** Run all NSE sources concurrently; partial failure is tolerated and reported. */
export async function fetchNseNative(): Promise<NativeResult> {
  const sources = { sast: fetchSast, deals: fetchDeals, pledge: fetchPledges, insider: fetchInsider, bse: fetchBse } as const;
  const names = Object.keys(sources) as (keyof typeof sources)[];
  const settled = await Promise.allSettled(names.map((n) => sources[n]()));
  const items: PromoterFeedItem[] = [];
  const failed: string[] = [];
  settled.forEach((s, i) => (s.status === "fulfilled" ? items.push(...s.value) : failed.push(names[i]!)));
  return { items, failed };
}
