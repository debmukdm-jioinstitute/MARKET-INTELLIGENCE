import { fetchChittorgarhIpoGmp } from "@/lib/feeds/sources/chittorgarh-ipo-gmp";
import { ipoNameMatchKey, matchGmpToName, type IpoGmpQuote } from "@/lib/feeds/sources/ipowatch-gmp";
import { getText } from "./http";

/**
 * Grey-market premium (GMP) from TWO independent aggregators. GMP is an
 * unofficial dealer quote — unregulated, unaudited, manipulable and disapproved
 * by SEBI — so it is sentiment only. When the two sources disagree by more than
 * 20% we keep the RANGE and no single point.
 */

export const GMP_DISAGREE_PCT = 0.2;
const IPOWATCH_URL = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#8377;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const inr = (s: string): number | null => {
  const m = /-?\d[\d,]*(?:\.\d+)?/.exec(s.replace(/₹\s*-\s*$/, ""));
  return m && !/^₹?\s*-\s*$/.test(s.trim()) ? Number(m[0].replace(/,/g, "")) : null;
};

/** IPO Watch's table: Company | GMP* | Trend | Price Band | Est. Gain | Date. Name cell reads "TNA Solutions (O) SME". */
export function parseIpoWatch(html: string, asOf = new Date().toISOString()): IpoGmpQuote[] {
  const source = { provider: "IPO Watch", url: IPOWATCH_URL, asOf };
  const out: IpoGmpQuote[] = [];
  for (const table of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const head = (rows[0]?.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map((c) => strip(c).toLowerCase());
    const nameIdx = head.findIndex((h) => h === "company" || h.includes("ipo name"));
    const gmpIdx = head.findIndex((h) => h.startsWith("gmp"));
    if (nameIdx < 0 || gmpIdx < 0) continue;
    const bandIdx = head.findIndex((h) => h.includes("price band"));
    const gainIdx = head.findIndex((h) => h.includes("gain"));
    const dateIdx = head.findIndex((h) => h === "date");
    for (const row of rows.slice(1)) {
      const cells = (row.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map(strip);
      const raw = cells[nameIdx] ?? "";
      const name = raw.replace(/\s*\((?:U|O|C)\)\s*.*$/i, "").replace(/\s+(?:SME|Mainboard)$/i, "").trim();
      if (!name) continue;
      const gmpInr = inr(cells[gmpIdx] ?? "");
      if (gmpInr !== null && (gmpInr < -5000 || gmpInr > 50_000)) continue; // implausible scrape
      const band = bandIdx >= 0 ? inr(cells[bandIdx] ?? "") : null;
      const gain = gainIdx >= 0 ? /\(([+-]?\d+(?:\.\d+)?)%\)/.exec(cells[gainIdx] ?? "") : null;
      out.push({ name, gmpInr, priceBandInr: band, estListingInr: null, estListingGainPct: gain ? Number(gain[1]) : null, dateWindow: dateIdx >= 0 ? cells[dateIdx] ?? null : null, status: /\(U\)/i.test(raw) ? "Upcoming" : /\(O\)/i.test(raw) ? "Open" : null, source });
    }
  }
  return out;
}

export type GmpSet = { chittorgarh: IpoGmpQuote[]; ipowatch: IpoGmpQuote[] };

/** Each source fails soft to []; the run reports which sources actually answered. */
export async function fetchGmpSources(): Promise<GmpSet> {
  const [chit, watch] = await Promise.allSettled([fetchChittorgarhIpoGmp(), getText(IPOWATCH_URL, { headers: HEADERS, timeoutMs: 25_000 }).then((h) => parseIpoWatch(h))]);
  return { chittorgarh: chit.status === "fulfilled" ? chit.value : [], ipowatch: watch.status === "fulfilled" ? watch.value : [] };
}

export type GmpResult = {
  value: number | null; // point estimate, only when sources agree (or only one source exists)
  low: number | null;
  high: number | null;
  pct: number | null;
  sources: string[];
  disagree: boolean;
};

/** Combine up to two source quotes into a point or a range. Pure. */
export function combineGmp(values: { provider: string; gmpInr: number | null }[], priceHigh: number | null): GmpResult | null {
  const have = values.filter((v): v is { provider: string; gmpInr: number } => v.gmpInr !== null);
  if (!have.length) return null;
  const nums = have.map((v) => v.gmpInr);
  const low = Math.min(...nums);
  const high = Math.max(...nums);
  const spread = Math.max(Math.abs(low), Math.abs(high));
  const disagree = have.length > 1 && spread > 0 && (high - low) / spread > GMP_DISAGREE_PCT;
  const value = disagree ? null : Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
  return { value, low, high, pct: value !== null && priceHigh ? Math.round((value / priceHigh) * 10_000) / 100 : null, sources: have.map((v) => v.provider), disagree };
}

export function gmpFor(set: GmpSet, name: string, symbol: string | null, priceHigh: number | null): GmpResult | null {
  const pick = (rows: IpoGmpQuote[]) => matchGmpToName(rows, name, symbol ?? undefined);
  const a = pick(set.chittorgarh);
  const b = pick(set.ipowatch);
  return combineGmp(
    [
      { provider: "Chittorgarh", gmpInr: a?.gmpInr ?? null },
      { provider: "IPO Watch", gmpInr: b?.gmpInr ?? null },
    ],
    priceHigh,
  );
}

export { ipoNameMatchKey };
