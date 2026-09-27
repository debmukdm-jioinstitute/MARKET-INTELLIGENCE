import { INDIA_INDEX_INSTRUMENT_KEYS } from "@/lib/feeds/india/instruments";
import { candleRangeToDates, fetchUpstoxHistoricalCandles } from "@/lib/feeds/sources/upstox";
import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
import { benchmarkYahooSymbol } from "@/lib/my-portfolio/benchmark-options";
import { benchmarkStockWeights } from "@/lib/my-portfolio/benchmark-constituents";
import type { PortfolioSettings } from "@/lib/my-portfolio/types";

export { NDX_WEIGHTS, NIFTY50_WEIGHTS, SPX_WEIGHTS } from "@/lib/my-portfolio/benchmark-constituents";

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
  }
  const yahoo = benchmarkYahooSymbol(benchmark);
  const points = await fetchYahooHistory(yahoo, "1y").catch(() => []);
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

export function weightsFor(benchmark: PortfolioSettings["benchmark"]) {
  return benchmarkStockWeights(benchmark);
}
