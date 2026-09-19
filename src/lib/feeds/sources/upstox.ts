import { feedFetch } from "@/lib/feeds/http";
import type { LiveQuote } from "@/lib/feeds/types";

/**
 * Upstox Market Quote (v3 LTP) — exchange-licensed NSE/BSE real-time data.
 * Auth is a free, 1-year "Analytics Token" (read-only, no daily re-login,
 * unlike a normal Upstox trading OAuth token): generate one from
 * https://account.upstox.com/developer/apps#analytics and set
 * UPSTOX_ACCESS_TOKEN. Docs: https://upstox.com/developer/api-documentation/ltp-v3/
 *
 * instrument_key values are exchange|ISIN for equities and exchange_segment|name
 * for indices, looked up once from Upstox's instrument master
 * (https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz)
 * — they're stable identifiers, not derived at request time.
 */

const LTP_URL = "https://api.upstox.com/v3/market-quote/ltp";

/** Yahoo-style ticker -> Upstox instrument_key, for the India names this app tracks. */
export const INDIA_INSTRUMENT_KEYS: Record<string, string> = {
  "^NSEI": "NSE_INDEX|Nifty 50",
  "^NSEBANK": "NSE_INDEX|Nifty Bank",
  "^BSESN": "BSE_INDEX|SENSEX",
  "^INDIAVIX": "NSE_INDEX|India VIX",
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
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token || instruments.length === 0) return [];

  const byInstrumentKey = new Map(instruments.map((i) => [i.instrumentKey, i.symbol]));
  const url = `${LTP_URL}?instrument_key=${encodeURIComponent(
    instruments.map((i) => i.instrumentKey).join(","),
  )}`;
  const res = await feedFetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
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
