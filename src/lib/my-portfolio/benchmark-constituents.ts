import type { BenchmarkId } from "@/lib/my-portfolio/benchmark-options";

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

function normalize(raw: Record<string, number>): Record<string, number> {
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) return raw;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / sum]));
}

/** BSE Sensex top weights (free-float snapshot; overlaps NIFTY large caps). */
const SENSEX_WEIGHTS_RAW: Record<string, number> = {
  RELIANCE: 0.12,
  HDFCBANK: 0.11,
  ICICIBANK: 0.09,
  INFY: 0.08,
  TCS: 0.07,
  ITC: 0.05,
  LT: 0.045,
  BHARTIARTL: 0.04,
  AXISBANK: 0.035,
  KOTAKBANK: 0.035,
  SBIN: 0.03,
  HINDUNILVR: 0.03,
  ASIANPAINT: 0.025,
  MARUTI: 0.025,
  SUNPHARMA: 0.02,
};

/** BSE Sensex — symbol list for live weight refresh (Yahoo .BO cap proxy). */
export const SENSEX_CONSTITUENT_SYMBOLS = Object.keys(SENSEX_WEIGHTS_RAW);

const BANKNIFTY_WEIGHTS_RAW: Record<string, number> = {
  HDFCBANK: 0.27,
  ICICIBANK: 0.24,
  SBIN: 0.11,
  AXISBANK: 0.1,
  KOTAKBANK: 0.09,
  INDUSINDBK: 0.05,
  BANKBARODA: 0.04,
  PNB: 0.03,
  FEDERALBNK: 0.02,
};

const FINNIFTY_WEIGHTS_RAW: Record<string, number> = {
  HDFCBANK: 0.2,
  ICICIBANK: 0.18,
  SBIN: 0.08,
  KOTAKBANK: 0.07,
  AXISBANK: 0.07,
  BAJFINANCE: 0.12,
  HDFCLIFE: 0.06,
  SBILIFE: 0.05,
  ICICIGI: 0.04,
  SHRIRAMFIN: 0.04,
  CHOLAFIN: 0.03,
};

const NIFTY_IT_WEIGHTS_RAW: Record<string, number> = {
  TCS: 0.32,
  INFY: 0.22,
  WIPRO: 0.1,
  HCLTECH: 0.09,
  TECHM: 0.07,
  LTIM: 0.06,
  PERSISTENT: 0.04,
  COFORGE: 0.03,
};

const NIFTY_METAL_WEIGHTS_RAW: Record<string, number> = {
  TATASTEEL: 0.22,
  JSWSTEEL: 0.18,
  HINDALCO: 0.16,
  COALINDIA: 0.12,
  VEDL: 0.1,
  NMDC: 0.08,
  JINDALSTEL: 0.07,
  SAIL: 0.04,
};

const NIFTY_ENERGY_WEIGHTS_RAW: Record<string, number> = {
  RELIANCE: 0.28,
  ONGC: 0.14,
  NTPC: 0.12,
  POWERGRID: 0.1,
  BPCL: 0.08,
  IOC: 0.08,
  GAIL: 0.06,
  ADANIGREEN: 0.05,
  TATAPOWER: 0.04,
};

/** Midcap 150 — liquid mid-cap names (subset snapshot for active share / Brinson). */
const MIDCPNIFTY_WEIGHTS_RAW: Record<string, number> = {
  PERSISTENT: 0.06,
  COFORGE: 0.05,
  AUROPHARMA: 0.05,
  MPHASIS: 0.05,
  INDHOTEL: 0.04,
  GODREJCP: 0.04,
  DIXON: 0.04,
  TRENT: 0.04,
  POLYCAB: 0.04,
  MAXHEALTH: 0.04,
  VOLTAS: 0.035,
  CUMMINSIND: 0.035,
  SRTRANSFIN: 0.035,
  PIIND: 0.03,
  MRF: 0.03,
};

/** Next 50 — names outside top NIFTY 50 heavyweights (approximate free-float mix). */
const NIFTYNXT50_WEIGHTS_RAW: Record<string, number> = {
  ADANIENT: 0.08,
  ADANIPORTS: 0.07,
  SIEMENS: 0.06,
  DLF: 0.06,
  GODREJCP: 0.05,
  INDHOTEL: 0.05,
  BAJAJHLDNG: 0.05,
  HAVELLS: 0.05,
  MOTHERSON: 0.05,
  PIDILITIND: 0.05,
  AMBUJACEM: 0.04,
  ACC: 0.04,
  COLPAL: 0.04,
  DABUR: 0.04,
};

const STOCK_WEIGHTS_BY_BENCHMARK: Partial<Record<BenchmarkId, Record<string, number>>> = {
  NIFTY50: NIFTY50_WEIGHTS,
  SENSEX: normalize(SENSEX_WEIGHTS_RAW),
  BANKNIFTY: normalize(BANKNIFTY_WEIGHTS_RAW),
  FINNIFTY: normalize(FINNIFTY_WEIGHTS_RAW),
  NIFTY_IT: normalize(NIFTY_IT_WEIGHTS_RAW),
  NIFTY_METAL: normalize(NIFTY_METAL_WEIGHTS_RAW),
  NIFTY_ENERGY: normalize(NIFTY_ENERGY_WEIGHTS_RAW),
  MIDCPNIFTY: normalize(MIDCPNIFTY_WEIGHTS_RAW),
  NIFTYNXT50: normalize(NIFTYNXT50_WEIGHTS_RAW),
  SPX: SPX_WEIGHTS,
  NDX: NDX_WEIGHTS,
  INDIA_VIX: {},
};

export function benchmarkStockWeights(benchmark: BenchmarkId): Record<string, number> {
  return STOCK_WEIGHTS_BY_BENCHMARK[benchmark] ?? NIFTY50_WEIGHTS;
}

export function isIndiaBenchmark(benchmark: BenchmarkId): boolean {
  return benchmark !== "SPX" && benchmark !== "NDX";
}

export function benchmarkSupportsActiveShare(benchmark: BenchmarkId): boolean {
  return benchmark !== "INDIA_VIX" && Object.keys(benchmarkStockWeights(benchmark)).length > 0;
}
