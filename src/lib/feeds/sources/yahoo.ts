import { feedFetch } from "@/lib/feeds/http";
import type { LiveQuote, MacroPoint } from "@/lib/feeds/types";

export type YahooQuoteDetail = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
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

export async function fetchYahooQuoteDetail(symbol: string): Promise<YahooQuoteDetail | null> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const res = await feedFetch(url);
  if (!res.ok) throw new Error(`Yahoo quote HTTP ${res.status}`);
  const json = (await res.json()) as { quoteResponse?: { result?: YahooQuoteDetail[] } };
  const row = json.quoteResponse?.result?.[0];
  return row ?? null;
}

export async function fetchYahooQuotes(symbols: string[]): Promise<LiveQuote[]> {
  if (!symbols.length) return [];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    symbols.join(","),
  )}`;
  const res = await feedFetch(url);
  if (!res.ok) throw new Error(`Yahoo quote HTTP ${res.status}`);
  const json = (await res.json()) as { quoteResponse?: { result?: YahooQuoteDetail[] } };
  const rows = json.quoteResponse?.result ?? [];
  const asOf = new Date().toISOString();
  return rows
    .filter((r) => typeof r.regularMarketPrice === "number")
    .map((r) => ({
      symbol: r.symbol,
      name: r.shortName ?? r.longName,
      price: r.regularMarketPrice!,
      change: r.regularMarketChange ?? 0,
      changePct: (r.regularMarketChangePercent ?? 0) / 100,
      currency: r.currency,
      asOf: r.regularMarketTime
        ? new Date(r.regularMarketTime * 1000).toISOString()
        : asOf,
      provider: "yahoo" as const,
    }));
}

export async function fetchYahooHistory(
  symbol: string,
  range = "2y",
): Promise<MacroPoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=${range}`;
  const res = await feedFetch(url);
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
