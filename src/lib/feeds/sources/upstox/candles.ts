import { feedFetch } from "@/lib/feeds/http";
import { UPSTOX_BASE_URL, upstoxHeaders } from "@/lib/feeds/sources/upstox/client";

export type Candle = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
};

type UpstoxCandleResponse = {
  status: string;
  data?: { candles: [string, number, number, number, number, number, number][] };
};

/**
 * Historical OHLCV candles. `unit` + `interval` follow Upstox's v3 spec
 * (unit: minutes/hours/days/weeks/months). Path order is to_date THEN
 * from_date, per the confirmed spec.
 */
export async function fetchUpstoxHistoricalCandles(
  instrumentKey: string,
  unit: "minutes" | "hours" | "days" | "weeks" | "months",
  interval: string,
  fromDate: string,
  toDate: string,
): Promise<Candle[]> {
  const headers = upstoxHeaders();
  if (!headers) return [];

  const url = `${UPSTOX_BASE_URL}/v3/historical-candle/${encodeURIComponent(
    instrumentKey,
  )}/${unit}/${interval}/${toDate}/${fromDate}`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox candles HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxCandleResponse;
  if (json.status !== "success" || !json.data) return [];

  return json.data.candles
    .map(([ts, open, high, low, close, volume, oi]) => ({ ts, open, high, low, close, volume, oi }))
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

/** Today's intraday candles (v3 intraday endpoint) — empty before the open / on holidays. */
export async function fetchUpstoxIntradayCandles(
  instrumentKey: string,
  interval = "5",
): Promise<Candle[]> {
  const headers = upstoxHeaders();
  if (!headers) return [];

  const url = `${UPSTOX_BASE_URL}/v3/historical-candle/intraday/${encodeURIComponent(
    instrumentKey,
  )}/minutes/${interval}`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox intraday candles HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxCandleResponse;
  if (json.status !== "success" || !json.data) return [];

  return json.data.candles
    .map(([ts, open, high, low, close, volume, oi]) => ({ ts, open, high, low, close, volume, oi }))
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

export type CandleRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

/** Maps a simple UI range to daily-candle from/to dates (YYYY-MM-DD). */
export function candleRangeToDates(range: CandleRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  if (range === "1D") {
    from.setDate(from.getDate() - 1);
  } else if (range === "1W") {
    from.setDate(from.getDate() - 7);
  } else {
    const months = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 }[range];
    if (months) from.setMonth(from.getMonth() - months);
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}
