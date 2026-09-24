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
  /** Returns a short note when the symbol matches, otherwise null. `bars` is oldest→newest, ≥ 60 bars. */
  test: (bars: Bar[], ind: Indicators) => string | null;
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
}

export interface ScanRun {
  asOf: string; // ISO time of the run
  lastBar: string; // date of newest bar seen (YYYY-MM-DD)
  universe: number;
  scanned: number;
  failed: number;
  scanners: Record<string, ScanRow[]>;
}
