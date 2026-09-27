/** Portfolio benchmark registry — India majors + optional US indices for mixed books. */
export const BENCHMARK_IDS = [
  "NIFTY50",
  "SENSEX",
  "BANKNIFTY",
  "FINNIFTY",
  "MIDCPNIFTY",
  "NIFTYNXT50",
  "NIFTY_IT",
  "NIFTY_METAL",
  "NIFTY_ENERGY",
  "INDIA_VIX",
  "SPX",
  "NDX",
] as const;

export type BenchmarkId = (typeof BENCHMARK_IDS)[number];

export type BenchmarkOption = {
  id: BenchmarkId;
  label: string;
  yahoo: string;
  region: "IN" | "US" | "VOL";
};

export const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  { id: "NIFTY50", label: "NIFTY 50", yahoo: "^NSEI", region: "IN" },
  { id: "SENSEX", label: "BSE SENSEX", yahoo: "^BSESN", region: "IN" },
  { id: "BANKNIFTY", label: "NIFTY Bank", yahoo: "^NSEBANK", region: "IN" },
  { id: "FINNIFTY", label: "NIFTY Financial Services", yahoo: "NIFTY_FIN_SERVICE.NS", region: "IN" },
  { id: "MIDCPNIFTY", label: "NIFTY Midcap 150", yahoo: "^NSEMDCP50", region: "IN" },
  { id: "NIFTYNXT50", label: "NIFTY Next 50", yahoo: "^NSMIDCP", region: "IN" },
  { id: "NIFTY_IT", label: "NIFTY IT", yahoo: "^CNXIT", region: "IN" },
  { id: "NIFTY_METAL", label: "NIFTY Metal", yahoo: "^CNXMETAL", region: "IN" },
  { id: "NIFTY_ENERGY", label: "NIFTY Energy", yahoo: "^CNXENERGY", region: "IN" },
  { id: "INDIA_VIX", label: "India VIX", yahoo: "^INDIAVIX", region: "VOL" },
  { id: "SPX", label: "S&P 500", yahoo: "^GSPC", region: "US" },
  { id: "NDX", label: "NASDAQ 100", yahoo: "^NDX", region: "US" },
];

export const BENCHMARK_LABEL: Record<BenchmarkId, string> = Object.fromEntries(
  BENCHMARK_OPTIONS.map((o) => [o.id, o.label]),
) as Record<BenchmarkId, string>;

export function benchmarkYahooSymbol(id: BenchmarkId): string {
  return BENCHMARK_OPTIONS.find((o) => o.id === id)?.yahoo ?? "^NSEI";
}

export function isBenchmarkId(value: string): value is BenchmarkId {
  return (BENCHMARK_IDS as readonly string[]).includes(value);
}
