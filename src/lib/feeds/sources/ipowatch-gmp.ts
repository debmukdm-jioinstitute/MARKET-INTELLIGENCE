import { feedFetch } from "@/lib/feeds/http";
import { compactToken, normalizeSymbolQuery } from "@/lib/feeds/symbol-normalize";

export type IpoGmpQuote = {
  name: string;
  /** Extra tokens from source slug (e.g. snapdeal → Acevector row). */
  matchKeywords?: string[];
  gmpInr: number | null;
  priceBandInr: number | null;
  estListingInr: number | null;
  estListingGainPct: number | null;
  dateWindow: string | null;
  status: string | null;
  source: { provider: string; url: string; asOf: string };
};

const GMP_URL = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0; +https://getmarketintelligence.in)",
  Accept: "text/html,application/xhtml+xml",
};

let cache: { at: number; rows: IpoGmpQuote[] } | null = null;
const TTL_MS = 15 * 60_000;

function parseInr(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "na") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parsePct(raw: string): number | null {
  const m = raw.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
}

function parseTables(html: string): IpoGmpQuote[] {
  const asOf = new Date().toISOString();
  const source = { provider: "IPO Watch", url: GMP_URL, asOf };
  const out: IpoGmpQuote[] = [];
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  for (const table of tables) {
    const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    if (rows.length < 2) continue;
    const headerCells = (rows[0]!.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map((c) =>
      stripTags(c).toLowerCase(),
    );
    const nameIdx = headerCells.findIndex((h) => h.includes("ipo name") || h === "name");
    const gmpIdx = headerCells.findIndex((h) => h.includes("gmp"));
    if (nameIdx < 0 || gmpIdx < 0) continue;

    const bandIdx = headerCells.findIndex((h) => h.includes("price band") || h === "ipo price");
    const listingIdx = headerCells.findIndex((h) => h.includes("est") || h.includes("listing"));
    const dateIdx = headerCells.findIndex((h) => h.includes("date"));
    const statusIdx = headerCells.findIndex((h) => h.includes("status"));

    for (const row of rows.slice(1)) {
      const cells = (row.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map((c) => decodeHtml(stripTags(c)));
      const name = cells[nameIdx]?.trim();
      if (!name || name.toLowerCase() === "ipo name") continue;
      const gmpRaw = cells[gmpIdx] ?? "";
      const gmpInr = parseInr(gmpRaw);
      // Sanity: grey-market premiums are typically within a few thousand INR.
      if (gmpInr != null && (gmpInr < -5000 || gmpInr > 50_000)) continue;

      const bandRaw = bandIdx >= 0 ? cells[bandIdx] ?? "" : "";
      const listingRaw = listingIdx >= 0 ? cells[listingIdx] ?? "" : "";
      const priceBandInr = parseInr(bandRaw.split(/[-–]/)[0] ?? bandRaw);
      const estListingInr = parseInr(listingRaw);
      const estListingGainPct =
        parsePct(listingRaw) ??
        (gmpInr != null && priceBandInr != null && priceBandInr > 0
          ? Math.round((gmpInr / priceBandInr) * 10000) / 100
          : null);

      out.push({
        name,
        gmpInr,
        priceBandInr,
        estListingInr,
        estListingGainPct,
        dateWindow: dateIdx >= 0 ? cells[dateIdx] ?? null : null,
        status: statusIdx >= 0 ? cells[statusIdx] ?? null : null,
        source,
      });
    }
  }

  // Dedupe by compact name, prefer first (current calendar table).
  const seen = new Set<string>();
  const deduped: IpoGmpQuote[] = [];
  for (const row of out) {
    const key = compactToken(row.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

/** Fail-soft scrape of IPO Watch GMP tables. Returns [] on any failure. */
export async function fetchIpoWatchGmp(): Promise<IpoGmpQuote[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  try {
    const res = await feedFetch(GMP_URL, { headers: BROWSER_HEADERS, timeoutMs: 12_000 });
    if (!res.ok) return cache?.rows ?? [];
    const html = await res.text();
    const rows = parseTables(html);
    if (rows.length) cache = { at: Date.now(), rows };
    return rows.length ? rows : (cache?.rows ?? []);
  } catch {
    return cache?.rows ?? [];
  }
}

/** Strip parentheticals so "Acevector (Snapdeal)" matches Upstox "Snapdeal". */
export function ipoNameMatchKey(raw: string): string {
  return compactToken(raw.replace(/\([^)]*\)/g, " "));
}

export function matchGmpToName(gmpRows: IpoGmpQuote[], name: string, symbol?: string): IpoGmpQuote | null {
  const want = ipoNameMatchKey(name);
  const wantSym = symbol ? compactToken(symbol) : "";
  const wantSpaced = normalizeSymbolQuery(name.replace(/\([^)]*\)/g, " "));

  let best: { row: IpoGmpQuote; score: number } | null = null;
  for (const row of gmpRows) {
    const rowCompact = ipoNameMatchKey(row.name);
    const rowSpaced = normalizeSymbolQuery(row.name.replace(/\([^)]*\)/g, " "));
    let score = 0;
    if (want && rowCompact === want) score = 100;
    else if (wantSym && rowCompact === wantSym) score = 95;
    else if (want && rowCompact.startsWith(want)) score = 80;
    else if (want && want.startsWith(rowCompact) && rowCompact.length >= 6) score = 70;
    else if (wantSpaced && rowSpaced.includes(wantSpaced)) score = 60;
    else if (wantSpaced && wantSpaced.includes(rowSpaced) && rowSpaced.length >= 8) score = 55;
    else if (want && rowCompact.includes(want) && want.length >= 6) score = 50;
    for (const kw of row.matchKeywords ?? []) {
      const k = compactToken(kw);
      if (wantSym && k === wantSym) score = Math.max(score, 92);
      else if (want && k === want) score = Math.max(score, 88);
      else if (want && k.includes(want) && want.length >= 5) score = Math.max(score, 75);
      else if (want && want.includes(k) && k.length >= 5) score = Math.max(score, 72);
    }
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }
  return best && best.score >= 50 ? best.row : null;
}
