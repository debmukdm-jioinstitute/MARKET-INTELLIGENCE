/**
 * Index constituent lists + live quotes for the India benchmarks drill-down.
 *
 * Shared by the API route (`/api/indices/[slug]/constituents`) and the
 * read-only MCP tool `get_index_constituents` (terminal parity).
 *
 * Data rules (strict): constituent lists come from NSE's official CSVs
 * (archives.nseindia.com) or the pinned BSE SENSEX snapshot; quotes come
 * from Yahoo Finance batch calls. Nothing is ever fabricated — when quotes
 * fail, constituents are returned with `quote: null` and a degraded
 * `quotesStatus`. No index weights are shown anywhere (no free source
 * publishes them).
 */
import { feedFetch } from "@/lib/feeds/http";
import { nseIndexConstituentSourceUrl } from "@/lib/feeds/india/nse-index-constituents";
import {
  fetchYahooQuoteDetailsCached,
  type YahooQuoteDetail,
} from "@/lib/feeds/sources/yahoo";
import { INDIA_INDEX_META, allIndiaIndexSlugs } from "@/lib/india-index-meta";
import { SENSEX_CONSTITUENTS, SENSEX_SNAPSHOT_DATE } from "@/lib/sensex-constituents";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ConstituentRow = {
  symbol: string;
  name: string;
  industry: string;
  isin: string | null;
};

export type QuotedConstituent = ConstituentRow & {
  price: number;
  change: number | null;
  /** Day change as a fraction (repo convention: Yahoo percent / 100). */
  changePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketCap: number | null;
  quoteAsOf: string | null;
};

export type UnquotedConstituent = ConstituentRow & { quote: null };

export type IndexConstituent = QuotedConstituent | UnquotedConstituent;

export type ConstituentsResponse =
  | {
      slug: string;
      label: string;
      constituents: IndexConstituent[];
      constituentsSource: { label: string; fetchedAt: string };
      quotesSource: { provider: "yahoo" | "upstox"; asOf: string } | null;
      quotesStatus: "ok" | "partial" | "unavailable";
      count: number;
    }
  | {
      slug: string;
      label: string;
      constituents: null;
      reason: "no-stock-constituents" | "constituents-unavailable";
      message: string;
      quotesSource: null;
      quotesStatus: "unavailable";
      count: 0;
    };

/* ------------------------------------------------------------------ */
/* NSE CSV rows (full columns, not just symbols)                       */
/*                                                                     */
/* NOTE: src/lib/feeds/india/nse-index-constituents.ts only exposes    */
/* symbols; the drill-down needs name/industry/ISIN too, so rows are   */
/* fetched here with the same URL helper + headers and a quote-aware   */
/* CSV parser. CSV content is cached in memory for 24h per slug.       */
/* ------------------------------------------------------------------ */

const NSE_ARCHIVE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/csv,text/plain,*/*",
  Referer: "https://www.nseindia.com/",
};

const CSV_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const csvRowCache = new Map<
  string,
  { at: number; fetchedAt: string; rows: ConstituentRow[] }
>();

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/** Parse full constituent rows. Columns: Company Name,Industry,Symbol,Series,ISIN Code.
 *  Industry strings are kept verbatim from the CSV. */
function parseConstituentRows(text: string): ConstituentRow[] {
  const lines = text.trim().split(/\r?\n/);
  const rows: ConstituentRow[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!.trim());
    if (cols.length < 5) continue;
    const name = cols[0] ?? "";
    const industry = cols[1] ?? "";
    const symbol = (cols[2] ?? "").toUpperCase();
    const isin = (cols[4] ?? "").trim() || null;
    if (!symbol || !/^[A-Z0-9&-]+$/.test(symbol) || seen.has(symbol)) continue;
    seen.add(symbol);
    rows.push({ symbol, name, industry, isin });
  }
  return rows;
}

async function fetchNseConstituentRows(
  slug: string,
  csvFile: string,
): Promise<{ rows: ConstituentRow[]; fetchedAt: string }> {
  const now = Date.now();
  const hit = csvRowCache.get(slug);
  if (hit && now - hit.at < CSV_CACHE_TTL_MS) return { rows: hit.rows, fetchedAt: hit.fetchedAt };

  const url = nseIndexConstituentSourceUrl(csvFile);
  const res = await feedFetch(url, { headers: NSE_ARCHIVE_HEADERS, timeoutMs: 30_000 });
  if (!res.ok) throw new Error(`NSE index CSV ${csvFile} HTTP ${res.status}`);
  const text = await res.text();
  const head = text.trimStart();
  if (head.startsWith("<!DOCTYPE") || head.startsWith("<html")) {
    throw new Error(`NSE index CSV ${csvFile} returned HTML`);
  }
  if (!head.startsWith("Company Name,")) {
    throw new Error(`NSE index CSV ${csvFile} unexpected header`);
  }
  const rows = parseConstituentRows(text);
  if (!rows.length) throw new Error(`NSE index CSV ${csvFile} had no rows`);
  const fetchedAt = new Date(now).toISOString();
  csvRowCache.set(slug, { at: now, fetchedAt, rows });
  return { rows, fetchedAt };
}

/* ------------------------------------------------------------------ */
/* Quotes                                                              */
/*                                                                     */
/* Symbols are mapped to Yahoo's NSE tickers (<SYMBOL>.NS) before the   */
/* batch call; the helper handles encodeURIComponent internally (do    */
/* NOT pre-encode "M&M" — that would double-encode the &). Chunks are  */
/* capped at 100 symbols (Yahoo v7 batch limit) and settled            */
/* independently so one bad chunk cannot fail the call. Missing        */
/* quotes are never fabricated: constituents come back with            */
/* `quote: null` and quotesStatus 'unavailable'.                       */
/* ------------------------------------------------------------------ */

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchQuotesBatched(
  symbols: string[],
): Promise<Map<string, YahooQuoteDetail | null>> {
  const out = new Map<string, YahooQuoteDetail | null>();
  const yahooSymbols = symbols.map((s) => `${s}.NS`);
  const settled = await Promise.allSettled(
    chunk(yahooSymbols, 100).map((c) => fetchYahooQuoteDetailsCached(c)),
  );
  for (const r of settled) {
    if (r.status === "fulfilled") {
      for (const [k, v] of r.value) out.set(k, v);
    }
  }
  return out;
}

function toConstituent(row: ConstituentRow, detail: YahooQuoteDetail | null): IndexConstituent {
  if (!detail || detail.regularMarketPrice == null) {
    return { ...row, quote: null };
  }
  return {
    ...row,
    price: detail.regularMarketPrice,
    change: detail.regularMarketChange ?? null,
    changePct:
      detail.regularMarketChangePercent != null
        ? detail.regularMarketChangePercent / 100
        : null,
    dayHigh: detail.regularMarketDayHigh ?? null,
    dayLow: detail.regularMarketDayLow ?? null,
    volume: detail.regularMarketVolume ?? null,
    marketCap: detail.marketCap ?? null,
    quoteAsOf: detail.regularMarketTime
      ? new Date(detail.regularMarketTime * 1000).toISOString()
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export type ConstituentsResult = {
  status: 200 | 404 | 500 | 502;
  body: ConstituentsResponse;
};

function nullBody(
  slug: string,
  label: string,
  reason: "no-stock-constituents" | "constituents-unavailable",
  message: string,
): ConstituentsResponse {
  return {
    slug,
    label,
    constituents: null,
    reason,
    message,
    quotesSource: null,
    quotesStatus: "unavailable",
    count: 0,
  };
}

/** Valid index slugs, for MCP input hints and validation. */
export function listIndexSlugs(): string[] {
  return allIndiaIndexSlugs();
}

/** Resolve constituent rows + live quotes for an index slug. Never throws
 *  for unknown slugs (returns 404 body); never fabricates quotes. */
export async function getIndexConstituents(rawSlug: string): Promise<ConstituentsResult> {
  const startedAt = Date.now();
  const slug = (rawSlug ?? "").toLowerCase();
  const meta = INDIA_INDEX_META[slug];
  if (!meta) {
    return {
      status: 404,
      body: {
        slug: rawSlug,
        label: rawSlug,
        constituents: null,
        reason: "constituents-unavailable",
        message: `Unknown index slug "${rawSlug}". Valid slugs: ${allIndiaIndexSlugs().join(", ")}.`,
        quotesSource: null,
        quotesStatus: "unavailable",
        count: 0,
      },
    };
  }

  if (meta.kind === "no-constituents") {
    return {
      status: 200,
      body: nullBody(
        slug,
        meta.label,
        "no-stock-constituents",
        meta.slug === "india-vix"
          ? "India VIX is a volatility index and has no stock constituents."
          : "Nifty GS 10Y is a government-securities index and has no stock constituents.",
      ),
    };
  }

  // Resolve constituent rows.
  let rows: ConstituentRow[];
  let sourceLabel: string;
  let fetchedAt: string;
  if (meta.kind === "sensex-pinned") {
    rows = SENSEX_CONSTITUENTS.map((c) => ({ ...c }));
    sourceLabel = "BSE SENSEX pinned snapshot";
    fetchedAt = `${SENSEX_SNAPSHOT_DATE}T00:00:00.000Z`;
  } else if (meta.csvFile) {
    try {
      const r = await fetchNseConstituentRows(slug, meta.csvFile);
      rows = r.rows;
      sourceLabel = "NSE Indices (archives.nseindia.com)";
      fetchedAt = r.fetchedAt;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.log(`[indices/${slug}] constituent CSV failed: ${message}`);
      return {
        status: 502,
        body: nullBody(
          slug,
          meta.label,
          "constituents-unavailable",
          "The constituent list could not be loaded right now. Please try again later.",
        ),
      };
    }
  } else {
    // Every "nse-csv" entry must carry a csvFile; reaching here means the
    // meta map is misconfigured.
    return {
      status: 500,
      body: nullBody(
        slug,
        meta.label,
        "constituents-unavailable",
        "The constituent list for this index is not available yet.",
      ),
    };
  }

  // Batch quotes (chunked, failure-isolated). Never fabricate on failure.
  const quotes = await fetchQuotesBatched(rows.map((r) => r.symbol));
  const constituents = rows.map((row) => toConstituent(row, quotes.get(`${row.symbol}.NS`) ?? null));
  const quotedCount = constituents.filter((c) => !("quote" in c)).length;
  const quotesStatus: "ok" | "partial" | "unavailable" =
    quotedCount === 0 ? "unavailable" : quotedCount === constituents.length ? "ok" : "partial";
  const newestAsOf = constituents
    .filter((c): c is QuotedConstituent => !("quote" in c) && c.quoteAsOf != null)
    .map((c) => c.quoteAsOf as string)
    .sort()
    .pop();

  console.log(
    `[indices/${slug}] rows=${rows.length} quoted=${quotedCount} ` +
      `status=${quotesStatus} cold=${Date.now() - startedAt}ms`,
  );

  return {
    status: 200,
    body: {
      slug,
      label: meta.label,
      constituents,
      constituentsSource: { label: sourceLabel, fetchedAt },
      quotesSource:
        quotesStatus === "unavailable"
          ? null
          : { provider: "yahoo", asOf: newestAsOf ?? new Date().toISOString() },
      quotesStatus,
      count: constituents.length,
    },
  };
}
