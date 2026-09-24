import type { Bar } from "./types";

/** Daily OHLCV for an NSE symbol from Yahoo Finance (1y). Returns null on any failure. */
export async function fetchDailyBars(symbol: string, range = "1y"): Promise<Bar[] | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?range=${range}&interval=1d`;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(12_000) });
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
