export type Timeframe = "5m" | "15m" | "1h" | "1d" | "1wk" | "1mo";
export type Bias = "bullish" | "bearish" | "neutral";

export const TIMEFRAMES: { id: Timeframe; label: string; intraday: boolean }[] = [
  { id: "5m", label: "5 min", intraday: true },
  { id: "15m", label: "15 min", intraday: true },
  { id: "1h", label: "1 hour", intraday: true },
  { id: "1d", label: "Daily", intraday: false },
  { id: "1wk", label: "Weekly", intraday: false },
  { id: "1mo", label: "Monthly", intraday: false },
];

export interface IndicatorReading {
  id: string;
  label: string;
  /** Headline value, already formatted (e.g. "68.4"). */
  value: string;
  /** Extra numbers shown under the headline, e.g. MACD signal & histogram. */
  detail: string[];
  bias: Bias;
  /** One plain-English line: what the indicator is saying now. */
  reading: string;
  /** The exact rule behind the badge. */
  rule: string;
  /** Last ~40 values for the sparkline (null where undefined). */
  spark: (number | null)[];
}

export interface PatternHit {
  id: string;
  name: string;
  kind: "candlestick" | "chart";
  bias: Bias;
  /** Bars before the latest bar (0 = latest). */
  barsAgo: number;
  time: number;
  rule: string;
  numbers: string[];
  why: string;
  confidence: "low" | "medium" | "high";
}

export interface Reason {
  source: string;
  text: string;
  bias: Bias;
}

export interface LevelZone {
  kind: "support" | "resistance";
  price: number;
  touches: number;
}

export interface LabResult {
  symbol: string;
  yahooTicker: string;
  tf: Timeframe;
  source: string;
  adjusted: boolean;
  asOf: number; // epoch seconds of the last bar
  fetchedAt: number; // epoch ms
  bars: number;
  price: { last: number; prev: number; change: number; changePct: number; dayHigh: number; dayLow: number; volume: number };
  indicators: IndicatorReading[];
  patterns: PatternHit[];
  levels: LevelZone[];
  verdict: { bullish: number; bearish: number; neutral: number; total: number; label: string; bias: Bias };
  reasons: Reason[];
  candles: { t: number; o: number; h: number; l: number; c: number; v: number }[];
}
