import { feedFetch } from "@/lib/feeds/http";
import type { LiveQuote, MacroPoint } from "@/lib/feeds/types";

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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=5d`;
  const res = await feedFetch(url, { headers: CHART_HEADERS, timeoutMs: 12_000 });
  if (!res.ok) return null;
  const json = (await res.json()) as { chart?: { result?: { meta?: ChartMeta }[] } };
  return json.chart?.result?.[0]?.meta ?? null;
}

function metaToLiveQuote(requestedSymbol: string, meta: ChartMeta): LiveQuote | null {
  const price = meta.regularMarketPrice;
  if (price == null || Number.isNaN(price)) return null;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose ?? price;
  const change = meta.regularMarketChange ?? price - prev;
  let changePct: number;
  if (meta.regularMarketChangePercent != null) {
    changePct = meta.regularMarketChangePercent / 100;
  } else if (prev) {
    changePct = (price - prev) / prev;
  } else {
    changePct = 0;
  }
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
  const batchSize = 8;
  const out: LiveQuote[] = [];
  for (let i = 0; i < unique.length; i += batchSize) {
    const chunk = unique.slice(i, i + batchSize);
    const rows = await Promise.all(chunk.map((s) => fetchYahooChartQuote(s)));
    for (const row of rows) {
      if (row) out.push(row);
    }
  }
  return out;
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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=${range}`;
  const res = await feedFetch(url, { headers: CHART_HEADERS });
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
