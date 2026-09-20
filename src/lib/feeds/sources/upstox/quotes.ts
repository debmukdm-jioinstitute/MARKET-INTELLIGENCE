import { feedFetch } from "@/lib/feeds/http";
import { upstoxHeaders } from "@/lib/feeds/sources/upstox/client";
import type { LiveQuote } from "@/lib/feeds/types";

/**
 * Upstox Market Quote — exchange-licensed NSE/BSE real-time data.
 *
 * instrument_key values are exchange|ISIN for equities and exchange_segment|name
 * for indices, looked up once from Upstox's instrument master
 * (https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz)
 * — they're stable identifiers, not derived at request time.
 */

const LTP_URL = "https://api.upstox.com/v3/market-quote/ltp";
const FULL_QUOTE_URL = "https://api.upstox.com/v2/market-quote/quotes";

/** Yahoo-style ticker -> Upstox instrument_key, for the India names this app tracks. */
export const INDIA_INSTRUMENT_KEYS: Record<string, string> = {
  "^NSEI": "NSE_INDEX|Nifty 50",
  "^NSEBANK": "NSE_INDEX|Nifty Bank",
  "^BSESN": "BSE_INDEX|SENSEX",
  "^INDIAVIX": "NSE_INDEX|India VIX",
  "^NIFTYGS10Y": "NSE_INDEX|Nifty GS 10Yr",
  "RELIANCE.NS": "NSE_EQ|INE002A01018",
  "HDFCBANK.NS": "NSE_EQ|INE040A01034",
  "INFY.NS": "NSE_EQ|INE009A01021",
};

type UpstoxLtpRow = {
  last_price: number;
  instrument_token: string;
  cp?: number;
};

type UpstoxLtpResponse = {
  status: string;
  data?: Record<string, UpstoxLtpRow>;
};

export async function fetchUpstoxQuotes(
  instruments: { instrumentKey: string; symbol: string }[],
): Promise<LiveQuote[]> {
  const headers = upstoxHeaders();
  if (!headers || instruments.length === 0) return [];

  const byInstrumentKey = new Map(instruments.map((i) => [i.instrumentKey, i.symbol]));
  const url = `${LTP_URL}?instrument_key=${encodeURIComponent(
    instruments.map((i) => i.instrumentKey).join(","),
  )}`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox LTP HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxLtpResponse;
  if (json.status !== "success" || !json.data) return [];

  const asOf = new Date().toISOString();
  const out: LiveQuote[] = [];
  for (const row of Object.values(json.data)) {
    const symbol = byInstrumentKey.get(row.instrument_token);
    const price = row.last_price;
    if (!symbol || !Number.isFinite(price) || price <= 0) continue;
    const prevClose = row.cp ?? 0;
    const change = prevClose > 0 ? price - prevClose : 0;
    out.push({
      symbol,
      price,
      change,
      changePct: prevClose > 0 ? change / prevClose : 0,
      asOf,
      provider: "upstox",
    });
  }
  return out;
}

/** Convenience wrapper for the fixed India symbol set above, keyed back to the Yahoo-style ticker. */
export async function fetchUpstoxIndiaQuotes(yahooSymbols: string[]): Promise<LiveQuote[]> {
  const instruments = yahooSymbols
    .map((symbol) => ({ symbol, instrumentKey: INDIA_INSTRUMENT_KEYS[symbol] }))
    .filter((i): i is { symbol: string; instrumentKey: string } => Boolean(i.instrumentKey));
  return fetchUpstoxQuotes(instruments);
}

export type DepthLevel = { quantity: number; price: number; orders: number };

export type FullMarketQuote = {
  symbol: string;
  instrumentKey: string;
  ohlc: { open: number; high: number; low: number; close: number };
  ltp: number;
  volume: number;
  avgPrice: number;
  netChange: number;
  totalBuyQuantity: number;
  totalSellQuantity: number;
  oi: number | null;
  oiDayHigh: number | null;
  oiDayLow: number | null;
  upperCircuit: number | null;
  lowerCircuit: number | null;
  lastTradeTime: string | null;
  depth: { buy: DepthLevel[]; sell: DepthLevel[] };
  asOf: string;
};

type UpstoxDepthLevel = { quantity: number; price: number; orders: number };

type UpstoxFullQuoteRow = {
  instrument_token: string;
  ohlc: { open: number; high: number; low: number; close: number };
  last_price: number;
  volume: number;
  average_price: number;
  net_change: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  oi?: number;
  oi_day_high?: number;
  oi_day_low?: number;
  upper_circuit_limit?: number;
  lower_circuit_limit?: number;
  last_trade_time?: string;
  depth?: { buy: UpstoxDepthLevel[]; sell: UpstoxDepthLevel[] };
};

type UpstoxFullQuoteResponse = {
  status: string;
  data?: Record<string, UpstoxFullQuoteRow>;
};

/** Full market quote — OHLC, volume, 5-level bid/ask depth, OI, circuit limits. */
export async function fetchUpstoxFullQuotes(
  instruments: { instrumentKey: string; symbol: string }[],
): Promise<FullMarketQuote[]> {
  const headers = upstoxHeaders();
  if (!headers || instruments.length === 0) return [];

  const byInstrumentKey = new Map(instruments.map((i) => [i.instrumentKey, i.symbol]));
  const url = `${FULL_QUOTE_URL}?instrument_key=${encodeURIComponent(
    instruments.map((i) => i.instrumentKey).join(","),
  )}`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox full quote HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxFullQuoteResponse;
  if (json.status !== "success" || !json.data) return [];

  const asOf = new Date().toISOString();
  const out: FullMarketQuote[] = [];
  for (const row of Object.values(json.data)) {
    const symbol = byInstrumentKey.get(row.instrument_token);
    if (!symbol || !Number.isFinite(row.last_price)) continue;
    out.push({
      symbol,
      instrumentKey: row.instrument_token,
      ohlc: row.ohlc,
      ltp: row.last_price,
      volume: row.volume ?? 0,
      avgPrice: row.average_price ?? 0,
      netChange: row.net_change ?? 0,
      totalBuyQuantity: row.total_buy_quantity ?? 0,
      totalSellQuantity: row.total_sell_quantity ?? 0,
      oi: row.oi ?? null,
      oiDayHigh: row.oi_day_high ?? null,
      oiDayLow: row.oi_day_low ?? null,
      upperCircuit: row.upper_circuit_limit ?? null,
      lowerCircuit: row.lower_circuit_limit ?? null,
      lastTradeTime: row.last_trade_time ?? null,
      depth: {
        buy: row.depth?.buy ?? [],
        sell: row.depth?.sell ?? [],
      },
      asOf,
    });
  }
  return out;
}
