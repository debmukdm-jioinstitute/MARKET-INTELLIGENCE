export interface Bar {
  t: number; // epoch seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/** Latest-bar metrics attached to every match. */
export interface ScanRow {
  symbol: string;
  name: string;
  industry: string;
  ltp: number;
  changePct: number;
  volume: number;
  volRatio: number; // today's volume / 20-day average
  rsi: number | null;
  note: string;
}

export type Bias = "buy" | "sell" | "watch";

export interface ScannerDef {
  id: string;
  label: string;
  description: string;
  bias: Bias;
  /**
   * Returns a short note when the symbol matches as of bar `i` (using only bars 0..i — no look-ahead), otherwise null.
   * `bars` is oldest→newest; the same function serves live scans (i = last bar) and backtests (i = any past bar).
   */
  test: (bars: Bar[], ind: Indicators, i: number) => string | null;
}

/** Indicator series aligned to `bars` (NaN where undefined). */
export interface Indicators {
  rsi: number[];
  macd: number[];
  macdSignal: number[];
  macdHist: number[];
  atr: number[];
  cci: number[];
  mfi: number[];
  aroonUp: number[];
  aroonDown: number[];
  atrStop: number[]; // ATR trailing stop (ratcheting)
  volAvg20: number[];
  sma50: number[];
  sma150: number[];
  sma200: number[];
  psar: number[];
  psarBull: number[]; // 1 when SAR is below price
  tenkan: number[];
  kijun: number[];
  cloudTop: number[]; // Ichimoku cloud as plotted at each bar (senkou spans shifted 26 back)
  cloudBottom: number[];
}

export interface ScanRun {
  asOf: string; // ISO time of the run
  lastBar: string; // date of newest bar seen (YYYY-MM-DD)
  universe: number;
  scanned: number;
  failed: number;
  scanners: Record<string, ScanRow[]>;
}

export interface HorizonStats {
  days: number; // holding period in sessions
  signals: number;
  winRate: number; // % of signals that made money in the scanner's direction (buy long, sell short)
  avgRet: number; // mean direction-adjusted return, %
  medRet: number;
  bench: number; // mean direction-adjusted return of ALL stock-sessions over the same horizon, %
  edge: number; // avgRet − bench
  worst: number;
  best: number;
}

export interface BacktestScanner {
  id: string;
  label: string;
  bias: Bias;
  horizons: HorizonStats[];
  /** ₹10,000 compounded daily on the average next-session return of all signals (see BacktestRun.method). */
  equity: { d: string; v: number }[];
}

export interface BacktestRun {
  asOf: string;
  from: string;
  to: string;
  symbols: number;
  sessions: number;
  method: string;
  benchmarkEquity: { d: string; v: number }[];
  scanners: BacktestScanner[];
}

export interface SignalBucket {
  label: string;
  n: number;
  hitRate: number | null; // % correct (for the neutral bucket: % of days that went up)
  avgRet: number | null; // mean next-session return in the direction of the call, %
}

export interface StockSignal {
  symbol: string;
  name: string;
  industry: string;
  ltp: number;
  changePct: number;
  pUp: number;
  confidence: number;
  rsi: number | null;
  entry: number;
  target: number;
  stop: number;
}

export interface IndexSignalBlock {
  close: number;
  changePct: number;
  horizon: number;
  pUp: number | null;
  call: "Bullish" | "Bearish" | "Neutral";
  ema20: number;
  ema50: number;
  trend: string;
  validation: {
    days: number;
    from: string;
    to: string;
    accuracy: number;
    alwaysUp: number;
    buckets: SignalBucket[];
    strategyReturn: number;
    buyHoldReturn: number;
    equity: { d: string; strategy: number; buyHold: number }[];
    recent: { d: string; pUp: number; call: "Up" | "Down"; actual: "Up" | "Down"; retPct: number }[];
  };
}

export interface FnoIndexSignalsPack {
  label: string;
  yahoo: string;
  horizons: Partial<Record<number, IndexSignalBlock>>;
}

export interface SignalsRun {
  asOf: string;
  lastBar: string;
  /** @deprecated Prefer `indices` + horizon selector; kept for notifications and legacy clients. */
  nifty: IndexSignalBlock & {
    pUp1: number | null;
    pUp5: number | null;
    call1: "Bullish" | "Bearish" | "Neutral";
    call5: "Bullish" | "Bearish" | "Neutral";
  };
  indices?: Record<string, FnoIndexSignalsPack>;
  stocks: {
    universe: number;
    scanned: number;
    validation: {
      sessions: number;
      buy: { n: number; hitRate: number; avgRet: number };
      sell: { n: number; hitRate: number; avgRet: number };
      base: { n: number; upRate: number; avgRet: number };
    };
    btst: StockSignal[];
    stbt: StockSignal[];
  };
}
