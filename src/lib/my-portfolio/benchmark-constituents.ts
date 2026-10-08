import type { BenchmarkId } from "@/lib/my-portfolio/benchmark-options";
import { SENSEX_CONSTITUENTS } from "@/lib/sensex-constituents";

/**
 * Index basket helpers. This file deliberately holds NO weights: index weights have no free official
 * source, so they are derived live (NSE constituent list x market cap, see refresh-benchmark-weights.ts)
 * or reported as unavailable. Nothing is typed in by hand.
 */

/** BSE SENSEX 30 symbol list (pinned snapshot, BSE publishes no free CSV) for the live weight refresh. */
export const SENSEX_CONSTITUENT_SYMBOLS: string[] = SENSEX_CONSTITUENTS.map((c) => c.symbol);

/** Equity benchmarks whose basket we can build from NSE or BSE constituent lists. */
const BASKET_BENCHMARKS: ReadonlySet<BenchmarkId> = new Set<BenchmarkId>([
  "NIFTY50", "SENSEX", "BANKNIFTY", "FINNIFTY", "NIFTY_IT", "NIFTY_METAL", "NIFTY_ENERGY", "MIDCPNIFTY", "NIFTYNXT50",
]);

export function isIndiaBenchmark(benchmark: BenchmarkId): boolean {
  return benchmark !== "SPX" && benchmark !== "NDX";
}

export function benchmarkSupportsActiveShare(benchmark: BenchmarkId): boolean {
  return BASKET_BENCHMARKS.has(benchmark);
}

/** Large, liquid Nifty 50 names used as a fixed symbol universe (names only, no weights). */
export const NIFTY50_CORE_SYMBOLS: readonly string[] = [
  "HDFCBANK", "RELIANCE", "ICICIBANK", "INFY", "TCS", "BHARTIARTL", "ITC", "LT", "KOTAKBANK", "AXISBANK",
  "SBIN", "HINDUNILVR", "BAJFINANCE", "MARUTI", "ASIANPAINT", "SUNPHARMA", "TITAN", "WIPRO",
];
