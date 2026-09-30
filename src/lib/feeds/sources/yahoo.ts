import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { LiveQuote, MacroPoint, NewsItem } from "@/lib/feeds/types";

const CHART_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

type ChartMeta = {
  symbol?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketTime?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  shortName?: string;
  longName?: string;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  averageDailyVolume3Month?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  epsTrailingTwelveMonths?: number;
  bookValue?: number;
  currency?: string;
  exchange?: string;
  quoteType?: string;
};

export type YahooQuoteDetail = ChartMeta & { symbol: string };

/* ------------------------------------------------------------------ */
/* Yahoo v7 batch quote — ONE request for up to ~100 symbols.          */
/* Source priority for quotes (official-first): Upstox (exchange-      */
/* licensed NSE/BSE) > Massive (keyed) > Yahoo v7 batch > Stooq CSV.   */
/* v7 sometimes 401s on serverless; on any failure we fall back to     */
/* the per-symbol v8 chart path below (today's behavior).              */
/* ------------------------------------------------------------------ */

const V7_FIELDS = [
  "symbol",
  "shortName",
  "longName",
  "regularMarketPrice",
  "regularMarketChange",
  "regularMarketChangePercent",
  "regularMarketTime",
  "regularMarketDayHigh",
  "regularMarketDayLow",
  "regularMarketOpen",
  "regularMarketVolume",
  "regularMarketPreviousClose",
  "previousClose",
  "fiftyTwoWeekHigh",
  "fiftyTwoWeekLow",
  "marketCap",
  "trailingPE",
  "forwardPE",
  "priceToBook",
  "dividendYield",
  "epsTrailingTwelveMonths",
  "bookValue",
  "currency",
  "exchange",
  "quoteType",
].join(",");

type V7QuoteResponse = {
  quoteResponse?: { result?: (ChartMeta & { symbol?: string })[]; error?: unknown };
};

/** Single v7 batch request. Returns details keyed by the symbol Yahoo echoed. */
async function fetchV7Batch(symbols: string[]): Promise<Map<string, YahooQuoteDetail>> {
  const out = new Map<string, YahooQuoteDetail>();
  if (!symbols.length) return out;
  const url =
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}` +
    `&fields=${V7_FIELDS}`;
  const res = await feedFetch(url, { headers: CHART_HEADERS, timeoutMs: 10_000 });
  if (!res.ok) throw new Error(`Yahoo v7 batch HTTP ${res.status}`);
  const json = (await res.json()) as V7QuoteResponse;
  for (const row of json.quoteResponse?.result ?? []) {
    if (!row.symbol || row.regularMarketPrice == null) continue;
    out.set(row.symbol, { symbol: row.symbol, ...row });
  }
  return out;
}

/** In-memory quote cache (per serverless instance) + singleflight coalescing. */
const DETAIL_TTL_MS = 60_000;
const detailCache = new Map<string, { at: number; detail: YahooQuoteDetail | null }>();
const detailInflight = new Map<string, Promise<Map<string, YahooQuoteDetail | null>>>();

function cacheKey(symbols: string[]): string {
  return [...new Set(symbols)].sort().join("\n");
}

/**
 * Batched quote details with cache + singleflight: concurrent callers asking
 * for the same symbol set share one upstream batch instead of each fanning out.
 */
export async function fetchYahooQuoteDetailsCached(
  symbols: string[],
): Promise<Map<string, YahooQuoteDetail | null>> {
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];
  if (!unique.length) return new Map();
  const key = cacheKey(unique);
  const now = Date.now();

  // Serve fully-cached sets from memory.
  let allCached = true;
  const cached = new Map<string, YahooQuoteDetail | null>();
  for (const s of unique) {
    const hit = detailCache.get(s);
    if (hit && now - hit.at < DETAIL_TTL_MS) cached.set(s, hit.detail);
    else {
      allCached = false;
      break;
    }
  }
  if (allCached) return cached;

  const ongoing = detailInflight.get(key);
  if (ongoing) return ongoing;

  const p = (async () => {
    const out = new Map<string, YahooQuoteDetail | null>();
    const missing = unique.filter((s) => {
      const hit = detailCache.get(s);
      return !(hit && Date.now() - hit.at < DETAIL_TTL_MS);
    });
    try {
      const batch = await fetchYahooDetailsBatch(missing);
      for (const s of missing) {
        const d = batch.get(s) ?? null;
        out.set(s, d);
        detailCache.set(s, { at: Date.now(), detail: d });
      }
    } catch {
      for (const s of missing) {
        const hit = detailCache.get(s);
        const d = hit ? hit.detail : null;
        out.set(s, d);
      }
    }
    // Fill any remaining from cache (fresh or stale — never invent).
    for (const s of unique) {
      if (!out.has(s)) out.set(s, detailCache.get(s)?.detail ?? null);
    }
    return out;
  })().finally(() => {
    detailInflight.delete(key);
  });
  detailInflight.set(key, p);
  return p;
}

/**
 * Core batch fetch: v7 (1 request) -> v7 with .NS suffix for missing Indian
 * names -> per-symbol v8 chart fallback for anything still missing.
 */
async function fetchYahooDetailsBatch(symbols: string[]): Promise<Map<string, YahooQuoteDetail>> {
  const out = new Map<string, YahooQuoteDetail>();
  if (!symbols.length) return out;

  // Pass 1: v7 batch, symbols as given.
  let v7Blocked = false;
  try {
    const batch = await fetchV7Batch(symbols);
    for (const [k, v] of batch) out.set(k, v);
  } catch {
    // Endpoint blocked (e.g. 401 on serverless) — skip the .NS retry and go
    // straight to the v8 fallback so we don't burn a second doomed request.
    v7Blocked = true;
  }

  // Pass 2: Indian names Yahoo only knows with a .NS suffix (only when v7 works).
  const missing = symbols.filter((s) => !out.has(s));
  const nsRetry = v7Blocked
    ? []
    : missing.filter(
        (s) => !s.includes(".") && !s.startsWith("^") && !s.includes("="),
      );
  if (nsRetry.length) {
    try {
      const batch = await fetchV7Batch(nsRetry.map((s) => `${s}.NS`));
      for (const s of nsRetry) {
        const d = batch.get(`${s}.NS`);
        if (d) out.set(s, { ...d, symbol: s });
      }
    } catch {
      /* fall through to v8 */
    }
  }

  // Pass 3: per-symbol v8 chart (previous behavior) for anything left.
  const stillMissing = symbols.filter((s) => !out.has(s));
  if (stillMissing.length) {
    const rows = await Promise.all(stillMissing.map((s) => fetchYahooQuoteDetailUncached(s)));
    for (let i = 0; i < stillMissing.length; i++) {
      const d = rows[i];
      if (d) out.set(stillMissing[i]!, d);
    }
  }
  return out;
}

/** Previous per-symbol v8 implementation, kept as the last-resort fallback. */
async function fetchYahooQuoteDetailUncached(symbol: string): Promise<YahooQuoteDetail | null> {
  const meta = await fetchChartMeta(symbol);
  if (!meta) return null;
  return { symbol, ...meta };
}

async function fetchChartMeta(symbol: string): Promise<ChartMeta | null> {
  let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=5d`;
  let res = await feedFetch(url, { headers: CHART_HEADERS, timeoutMs: 10_000 });
  if (!res.ok && !symbol.includes(".") && !symbol.startsWith("^") && !symbol.includes("=")) {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      `${symbol}.NS`,
    )}?interval=1d&range=5d`;
    res = await feedFetch(url, { headers: CHART_HEADERS, timeoutMs: 10_000 });
  }
  if (!res.ok) return null;
  const json = (await res.json()) as { chart?: { result?: { meta?: ChartMeta }[] } };
  return json.chart?.result?.[0]?.meta ?? null;
}

function metaToLiveQuote(requestedSymbol: string, meta: ChartMeta): LiveQuote | null {
  const price = meta.regularMarketPrice;
  if (price == null || Number.isNaN(price)) return null;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose ?? price;
  // NOTE: with range=5d, chartPreviousClose is the close BEFORE THE RANGE (~5 sessions ago), not yesterday's
  // close, so (price - prev) is a multi-day move. regularMarketChangePercent is the true 1-day figure, so it is
  // authoritative and the absolute change is derived from it (this is what was wrong for ^TNX's "change").
  const reportedPct = meta.regularMarketChangePercent != null ? meta.regularMarketChangePercent / 100 : null;
  const changePct = reportedPct ?? (prev ? (price - prev) / prev : 0);
  const change = meta.regularMarketChange ?? (reportedPct != null ? (price * reportedPct) / (1 + reportedPct) : price - prev);
  const asOf = meta.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();
  return {
    symbol: requestedSymbol,
    name: meta.shortName ?? meta.longName,
    price,
    change,
    changePct,
    currency: meta.currency,
    asOf,
    provider: "yahoo",
  };
}

/** Batch quotes via the cached v7 pipeline: 1 upstream request for N symbols
 *  (was: 1 request per symbol). Falls back to per-symbol v8 if v7 is blocked. */
export async function fetchYahooQuotes(symbols: string[]): Promise<LiveQuote[]> {
  const details = await fetchYahooQuoteDetailsCached(symbols);
  const out: LiveQuote[] = [];
  for (const [symbol, detail] of details) {
    if (!detail) continue;
    const q = metaToLiveQuote(symbol, detail);
    if (q) out.push(q);
  }
  return out;
}

export async function fetchYahooQuoteDetail(symbol: string): Promise<YahooQuoteDetail | null> {
  const details = await fetchYahooQuoteDetailsCached([symbol]);
  return details.get(symbol) ?? null;
}

/** Batch chart-meta quotes (price, day range, 52w, volume) — one v7 request
 *  per ~100 symbols instead of one v8 request per symbol. */
export async function fetchYahooQuoteDetails(symbols: string[]): Promise<YahooQuoteDetail[]> {
  const details = await fetchYahooQuoteDetailsCached(symbols);
  return [...details.values()].filter((d): d is YahooQuoteDetail => d !== null);
}

export async function fetchYahooHistory(
  symbol: string,
  range = "2y",
): Promise<MacroPoint[]> {
  let querySymbol = symbol;
  let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    querySymbol,
  )}?interval=1d&range=${range}`;
  let res = await feedFetch(url, { headers: CHART_HEADERS });
  if (!res.ok && !symbol.includes(".") && !symbol.startsWith("^") && !symbol.includes("=")) {
    querySymbol = `${symbol}.NS`;
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      querySymbol,
    )}?interval=1d&range=${range}`;
    res = await feedFetch(url, { headers: CHART_HEADERS });
  }
  if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
  };
  const result = json.chart?.result?.[0];
  const stamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points: MacroPoint[] = [];
  for (let i = 0; i < stamps.length; i += 1) {
    const close = closes[i];
    if (close == null || Number.isNaN(close)) continue;
    points.push({
      date: new Date(stamps[i]! * 1000).toISOString().slice(0, 10),
      value: close,
    });
  }
  return points;
}

export function yahooFinanceUrl(symbol: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

export type YahooSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
};

/** Search-by-name/symbol — used for the "add a US stock" autocomplete. */
export async function searchYahooSymbols(query: string): Promise<YahooSearchResult[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query,
  )}&quotesCount=10&newsCount=0`;
  const res = await feedFetch(url, { headers: CHART_HEADERS });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    quotes?: {
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchDisp?: string;
      sector?: string;
      quoteType?: string;
    }[];
  };
  return (json.quotes ?? [])
    .filter((q) => q.quoteType === "EQUITY" && q.symbol)
    .map((q) => ({
      symbol: q.symbol!,
      name: q.longname ?? q.shortname ?? q.symbol!,
      exchange: q.exchDisp ?? "",
      sector: q.sector,
    }));
}

/** No-key headline feed for a US ticker — used by the AI Desk's sentiment agents. */
export async function fetchYahooNews(symbol: string): Promise<NewsItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const res = await feedFetch(url, { headers: CHART_HEADERS });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRss(xml, "yahoo", 10);
}
