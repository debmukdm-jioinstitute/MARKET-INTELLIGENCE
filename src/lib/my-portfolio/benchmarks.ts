import { INDIA_INDEX_INSTRUMENT_KEYS } from "@/lib/feeds/india/instruments";
import { candleRangeToDates, fetchUpstoxHistoricalCandles } from "@/lib/feeds/sources/upstox";
import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
import type { PortfolioSettings } from "@/lib/my-portfolio/types";

export type BenchmarkPoint = { date: string; value: number };

export async function fetchBenchmarkHistory(benchmark: PortfolioSettings["benchmark"]): Promise<BenchmarkPoint[]> {
  if (benchmark === "NIFTY50") {
    try {
      const { from, to } = candleRangeToDates("1Y");
      const candles = await fetchUpstoxHistoricalCandles(INDIA_INDEX_INSTRUMENT_KEYS.NIFTY, "days", "1", from, to).catch(
        () => [],
      );
      if (candles && candles.length > 5) {
        return candles.map((c) => ({ date: c.ts.slice(0, 10), value: c.close }));
      }
    } catch {
      // fallback to Yahoo below
    }
    return fetchYahooHistory("^NSEI", "1y").catch(() => []);
  }
  const symbol = benchmark === "NDX" ? "^NDX" : "^GSPC";
  const points = await fetchYahooHistory(symbol, "1y").catch(() => []);
  return points;
}

/**
 * Approximate, periodically-refreshed constituent weight snapshots — NOT live
 * index data. Used only to estimate Active Share (how different your holdings'
 * weights are from the benchmark's). Compiled from widely-published large-cap
 * index weightings; dated below. Good enough for an approximate "how
 * different from the index" read, not for precision index replication.
 */
export const BENCHMARK_SNAPSHOT_DATE = "2026-06-01";

export const NIFTY50_WEIGHTS: Record<string, number> = {
  HDFCBANK: 0.129,
  RELIANCE: 0.091,
  ICICIBANK: 0.082,
  INFY: 0.056,
  TCS: 0.038,
  BHARTIARTL: 0.037,
  ITC: 0.035,
  LT: 0.034,
  KOTAKBANK: 0.032,
  AXISBANK: 0.031,
  SBIN: 0.03,
  HINDUNILVR: 0.024,
  BAJFINANCE: 0.023,
  MARUTI: 0.017,
  ASIANPAINT: 0.014,
  SUNPHARMA: 0.014,
  TITAN: 0.013,
  WIPRO: 0.011,
};

export const SPX_WEIGHTS: Record<string, number> = {
  AAPL: 0.07,
  MSFT: 0.065,
  NVDA: 0.06,
  AMZN: 0.038,
  GOOGL: 0.02,
  META: 0.024,
  AVGO: 0.021,
  TSM: 0.0,
  LLY: 0.015,
  JPM: 0.013,
  UNH: 0.011,
  BRK: 0.017,
  XOM: 0.009,
  JNJ: 0.008,
  CAT: 0.006,
  CVX: 0.007,
};

export const NDX_WEIGHTS: Record<string, number> = {
  AAPL: 0.09,
  MSFT: 0.085,
  NVDA: 0.08,
  AMZN: 0.055,
  AVGO: 0.045,
  META: 0.038,
  GOOGL: 0.035,
  COST: 0.02,
};

export function weightsFor(benchmark: PortfolioSettings["benchmark"]) {
  if (benchmark === "NIFTY50") return NIFTY50_WEIGHTS;
  if (benchmark === "NDX") return NDX_WEIGHTS;
  return SPX_WEIGHTS;
}
