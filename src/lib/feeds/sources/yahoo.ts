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

export async function fetchYahooChartQuote(symbol: string): Promise<LiveQuote | null> {
  const meta = await fetchChartMeta(symbol);
  if (!meta) return null;
  return metaToLiveQuote(symbol, meta);
}

/** Yahoo v7 quote often returns 401 on serverless; chart v8 is the primary path. */
export async function fetchYahooQuotes(symbols: string[]): Promise<LiveQuote[]> {
  const unique = [...new Set(symbols)];
  const batchSize = 16;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += batchSize) {
    chunks.push(unique.slice(i, i + batchSize));
  }
  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const rows = await Promise.all(chunk.map((s) => fetchYahooChartQuote(s)));
      return rows.filter((r): r is LiveQuote => r !== null);
    }),
  );
  return chunkResults.flat();
}

export async function fetchYahooQuoteDetail(symbol: string): Promise<YahooQuoteDetail | null> {
  const meta = await fetchChartMeta(symbol);
  if (!meta) return null;
  return { symbol, ...meta };
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
