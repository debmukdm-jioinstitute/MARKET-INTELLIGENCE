import { feedFetch } from "@/lib/feeds/http";
import type { Candle, CandleRange } from "@/lib/feeds/sources/upstox/candles";

const CHART_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0)",
  Accept: "application/json",
};

function yahooChartParams(range: CandleRange): { yahooRange: string; interval: string; trimDays?: number } {
  switch (range) {
    case "1D":
      return { yahooRange: "1d", interval: "5m" };
    case "1W":
      return { yahooRange: "1mo", interval: "1d", trimDays: 7 };
    case "1M":
      return { yahooRange: "1mo", interval: "1d" };
    case "3M":
      return { yahooRange: "3mo", interval: "1d" };
    case "6M":
      return { yahooRange: "6mo", interval: "1d" };
    case "1Y":
      return { yahooRange: "1y", interval: "1d" };
  }
}

function parseYahooCandles(json: unknown): Candle[] {
  const result = (json as { chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }[] } }[] } })
    .chart?.result?.[0];
  const stamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  if (!stamps.length || !q) return [];

  const out: Candle[] = [];
  for (let i = 0; i < stamps.length; i += 1) {
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    const close = q.close?.[i];
    const volume = q.volume?.[i];
    if (
      typeof open !== "number" ||
      typeof high !== "number" ||
      typeof low !== "number" ||
      typeof close !== "number" ||
      !Number.isFinite(close)
    ) {
      continue;
    }
    out.push({
      ts: new Date(stamps[i]! * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume: typeof volume === "number" && Number.isFinite(volume) ? volume : 0,
      oi: 0,
    });
  }
  return out.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

/** OHLCV from Yahoo chart API — backs India index hero when Upstox intraday/history is empty. */
export async function fetchYahooCandles(yahooSymbol: string, range: CandleRange): Promise<Candle[]> {
  const { yahooRange, interval, trimDays } = yahooChartParams(range);
  const sym = yahooSymbol;

  const fetchOne = async (ticker: string) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${yahooRange}`;
    const res = await feedFetch(url, { headers: CHART_HEADERS, timeoutMs: 12_000 });
    if (!res.ok) return null;
    return parseYahooCandles(await res.json());
  };

  let candles = (await fetchOne(sym)) ?? [];
  if (
    !candles.length &&
    !sym.includes(".") &&
    !sym.startsWith("^") &&
    !sym.includes("=")
  ) {
    candles = (await fetchOne(`${sym}.NS`)) ?? [];
  }

  if (range === "1D" && !candles.length) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=5d`;
    const res = await feedFetch(url, { headers: CHART_HEADERS, timeoutMs: 12_000 });
    if (res.ok) {
      const extended = parseYahooCandles(await res.json());
      candles = extended.length > 80 ? extended.slice(-80) : extended;
    }
  }

  if (trimDays && candles.length > trimDays) {
    candles = candles.slice(-trimDays);
  }
  return candles;
}

export const YAHOO_INDEX_BY_SYMBOL: Record<string, string> = {
  "NIFTY 50": "^NSEI",
  NIFTY: "^NSEI",
  "BANK NIFTY": "^NSEBANK",
  BANKNIFTY: "^NSEBANK",
  SENSEX: "^BSESN",
};

export function yahooTickerForIndiaSymbol(symbol: string, instrumentSymbol: string): string {
  const key = instrumentSymbol.toUpperCase();
  if (YAHOO_INDEX_BY_SYMBOL[key]) return YAHOO_INDEX_BY_SYMBOL[key];
  const bare = symbol.toUpperCase().replace(/\s+/g, "");
  if (YAHOO_INDEX_BY_SYMBOL[bare]) return YAHOO_INDEX_BY_SYMBOL[bare];
  if (symbol.startsWith("^") || symbol.includes(".") || symbol.includes("=")) return symbol;
  return `${symbol.replace(/\.NS$/i, "")}.NS`;
}
