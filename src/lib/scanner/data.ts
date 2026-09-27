import { feedFetch } from "@/lib/feeds/http";
import type { Bar } from "./types";

const CHART_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

/** Daily OHLCV for an NSE symbol from Yahoo Finance. Returns null on any failure. */
export function fetchDailyBars(symbol: string, range = "1y"): Promise<Bar[] | null> {
  return fetchYahooBars(`${symbol}.NS`, range);
}

/** Daily OHLCV for any Yahoo ticker (e.g. "^NSEI"). Returns null on any failure. */
export async function fetchYahooBars(ticker: string, range = "10y"): Promise<Bar[] | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d`;
  try {
    const res = await feedFetch(url, { headers: CHART_HEADERS, timeoutMs: 20_000 });
    if (!res.ok) return null;
    const j = await res.json();
    const r = j?.chart?.result?.[0];
    const q = r?.indicators?.quote?.[0];
    if (!r?.timestamp || !q) return null;
    const bars: Bar[] = [];
    for (let i = 0; i < r.timestamp.length; i++) {
      const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i], v = q.volume[i];
      if ([o, h, l, c].some((x) => typeof x !== "number" || !Number.isFinite(x))) continue;
      if (!v && h === l) continue; // Yahoo placeholder bar (holiday/glitch): no volume, no range
      bars.push({ t: r.timestamp[i], o, h, l, c, v: typeof v === "number" ? v : 0 });
    }
    return bars;
  } catch {
    return null;
  }
}
