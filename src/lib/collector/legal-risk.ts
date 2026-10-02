import { getNseEquityUniverse } from "@/lib/feeds/india/universe";
import { buildSymbolResolver } from "./broker-calls";
import { getText, today } from "./http";
import type { Collector, CollectorContext, RecordBatch, SeriesResult } from "./types";

/**
 * SEBI enforcement orders → listed companies. Weekly crawl of SEBI's public
 * listings (final/interim orders, settlement orders, adjudication orders),
 * name-matched to NSE-listed companies. Stored: title, date, link — nothing
 * more. We never state what an order means; the UI quotes the title and links
 * the document.
 *
 * NCLT: its order search sits behind a human captcha, which we do not
 * circumvent, so NCLT is a link-out in the UI rather than a collector.
 */

const ID = "legal-risk";
const MIN_INTERVAL_MS = 6 * 24 * 3600_000;
const SEBI_LISTING = "https://www.sebi.gov.in/sebiweb/ajax/home/getnewslistinfo.jsp";
const SEBI_HOME = (smid: number) => `https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=2&ssid=9&smid=${smid}`;
const PAGES_FIRST_RUN = 4;
const PAGES_DELTA = 2;

/** SEBI "Enforcement → Orders" sub-listings that name companies (appeals, court orders and 2005-era orders are skipped). */
const LISTINGS = [
  { smid: 2, type: "SEBI order", text: "Orders of Chairman/Members" },
  { smid: 3, type: "SEBI settlement order", text: "Settlement Orders" },
  { smid: 6, type: "SEBI adjudication order", text: "Orders of Adjudicating Officer" },
] as const;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,*/*",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export type SebiItem = { date: string; title: string; url: string };

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** "Sep 28, 2026" → "2026-09-28". */
export function parseSebiDate(s: string): string | null {
  const m = /^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1].toLowerCase());
  return mi < 0 ? null : `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** Listing rows: <td>Sep 28, 2026</td><td><a href='…' title="…">. Works for both the full page and the ajax fragment. */
export function parseSebiListing(html: string): SebiItem[] {
  const out: SebiItem[] = [];
  for (const m of html.matchAll(/<td>\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s*<\/td>\s*<td>\s*<a href=['"]([^'"]+)['"][^>]*?title="([^"]*)"/g)) {
    const date = parseSebiDate(m[1]);
    const title = decode(m[3]);
    if (date && title) out.push({ date, title, url: m[2] });
  }
  return out;
}

/** Entity names an order's title is "in the matter of" — whole phrase plus comma/"and"-separated parts. */
export function entitiesFromTitle(title: string): string[] {
  const m = /\b(?:in the matter of|in respect of|in re)\s+(.+)$/i.exec(title);
  if (!m) return [];
  const core = m[1]
    .replace(/\(.*?\)/g, " ")
    .replace(/\s+-\s+.*$/, "") // " - Research Analyst", " - Appeal No…"
    .replace(/\s+(?:for|regarding|with respect to)\s+(?:alleged|violation|non|the)\b.*$/i, "")
    .replace(/\s+alleged\b.*$/i, "")
    .trim();
  const parts = core.split(/\s*,\s*|\s+and\s+|\s+&\s+/i).map((p) => p.trim()).filter((p) => p.length >= 3);
  return [...new Set([core, ...parts])].filter(Boolean);
}

export type EventRow = { symbol: string | null; companyName: string; source: string; eventType: string; title: string; eventDate: string; documentUrl: string; caseNo: null; status: null };

export function matchEvents(items: SebiItem[], type: string, resolve: (name: string) => string | null): EventRow[] {
  const rows: EventRow[] = [];
  for (const it of items) {
    for (const name of entitiesFromTitle(it.title)) {
      const symbol = resolve(name);
      if (!symbol) continue;
      rows.push({ symbol, companyName: name, source: "SEBI", eventType: type, title: it.title, eventDate: it.date, documentUrl: it.url, caseNo: null, status: null });
      break; // one row per document (document_url is the key)
    }
  }
  return rows;
}

async function fetchPage(smid: number, text: string, page: number): Promise<SebiItem[]> {
  const body = new URLSearchParams({
    nextValue: "1", next: "n", search: "", fromDate: "", toDate: "", fromYear: "", toYear: "", deptId: "-1",
    sid: "2", ssid: "9", smid: String(smid), ssidhidden: "9", smidhidden: String(smid), intmid: "-1",
    sText: "Enforcement", ssText: "Orders", smText: text, doDirect: String(page), // SEBI's own pager: searchFormNewsList("n", <page index>) — the page number travels in doDirect
  });
  const html = await getText(SEBI_LISTING, { method: "POST", headers: { ...HEADERS, Referer: SEBI_HOME(smid), Origin: "https://www.sebi.gov.in" }, body, timeoutMs: 30_000, attempts: 2 });
  return parseSebiListing(html);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const force = process.env.LEGAL_RISK_FORCE === "1";
  const lastRun = await ctx?.watermark("lastrun:legal-risk").catch(() => null);
  const heartbeat = (value: number, meta: Record<string, unknown>, records?: RecordBatch): SeriesResult => ({
    id: "legal_risk_matched",
    label: "SEBI orders matched to listed companies this run",
    unit: "orders",
    category: "market",
    provider: "SEBI",
    url: "https://www.sebi.gov.in/enforcement/orders.html",
    obs: [{ date: today(), value, meta }],
    ...(records ? { records } : {}),
  });
  if (!force && lastRun && Date.now() - Date.parse(lastRun) < MIN_INTERVAL_MS) return [heartbeat(0, { skipped: "ran <6 days ago", lastRun })];

  const universe = await getNseEquityUniverse();
  const resolve = buildSymbolResolver(universe);
  const rows: EventRow[] = [];
  const watermarks: Record<string, string> = {};
  let listed = 0;
  let reached = 0;

  for (const l of LISTINGS) {
    const wm = await ctx?.watermark(`legal:sebi:${l.smid}`).catch(() => null);
    const items: SebiItem[] = [];
    for (let page = 0; page < (wm ? PAGES_DELTA : PAGES_FIRST_RUN); page++) {
      let got: SebiItem[];
      try {
        got = await fetchPage(l.smid, l.text, page);
        reached++;
      } catch {
        break; // best-effort per listing; the run only fails if SEBI was never reachable
      }
      if (!got.length) break;
      items.push(...got);
      if (wm && got[got.length - 1].date <= wm) break; // reached ingested territory
      await sleep(600);
    }
    const fresh = wm ? items.filter((i) => i.date >= wm) : items; // equal date: hash/unique dedup covers repeats
    listed += fresh.length;
    rows.push(...matchEvents(fresh, l.type, resolve));
    const newest = items.reduce<string | null>((a, i) => (!a || i.date > a ? i.date : a), null);
    if (newest) watermarks[`legal:sebi:${l.smid}`] = newest > (wm ?? "") ? newest : wm!;
  }

  if (reached === 0) throw new Error("SEBI order listings unreachable");
  watermarks["lastrun:legal-risk"] = new Date().toISOString();
  return [heartbeat(rows.length, { ordersListed: listed, matched: rows.length }, { table: "regulatory_events", rows: rows as unknown as Record<string, unknown>[], watermarks })];
}

export const legalRisk: Collector = { id: ID, run, actionsOnly: true, timeoutMs: 6 * 60_000 };
