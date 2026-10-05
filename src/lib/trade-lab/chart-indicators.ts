import type { Bar } from "@/lib/scanner/types";
import { adx, aroon, atr, bollinger, cci, emaStd, ichimoku, macd, mfi, obv, psar, rsi, sessionVwap, sma, stochastic, supertrend } from "./indicators";

/**
 * Indicators the chart can plot. `overlay` ones draw on the price pane; `pane` ones get their own
 * sub-pane under it. Values come from the same functions the Trade Lab verdicts use, so the plotted
 * lines always match the Bullish/Bearish cards.
 */
export type ChartIndicatorKey =
  | "ema20" | "ema50" | "ema200" | "sma20" | "sma50" | "sma200" | "bb" | "supertrend" | "ichimoku" | "psar" | "vwap"
  | "rsi" | "macd" | "stoch" | "adx" | "cci" | "aroon" | "obv" | "atr" | "mfi";

export interface ChartIndicatorMeta {
  key: ChartIndicatorKey;
  label: string;
  kind: "overlay" | "pane";
  group: "Trend" | "Momentum" | "Volatility" | "Volume";
  /** Needs traded volume. */
  needsVolume?: boolean;
  /** Only meaningful on intraday bars. */
  intradayOnly?: boolean;
}

export const CHART_INDICATORS: ChartIndicatorMeta[] = [
  { key: "ema20", label: "EMA 20", kind: "overlay", group: "Trend" },
  { key: "ema50", label: "EMA 50", kind: "overlay", group: "Trend" },
  { key: "ema200", label: "EMA 200", kind: "overlay", group: "Trend" },
  { key: "sma20", label: "SMA 20", kind: "overlay", group: "Trend" },
  { key: "sma50", label: "SMA 50", kind: "overlay", group: "Trend" },
  { key: "sma200", label: "SMA 200", kind: "overlay", group: "Trend" },
  { key: "supertrend", label: "Supertrend (10,3)", kind: "overlay", group: "Trend" },
  { key: "ichimoku", label: "Ichimoku (9,26,52)", kind: "overlay", group: "Trend" },
  { key: "psar", label: "Parabolic SAR", kind: "overlay", group: "Trend" },
  { key: "vwap", label: "VWAP (session)", kind: "overlay", group: "Volume", needsVolume: true, intradayOnly: true },
  { key: "bb", label: "Bollinger Bands (20,2)", kind: "overlay", group: "Volatility" },
  { key: "macd", label: "MACD (12,26,9)", kind: "pane", group: "Momentum" },
  { key: "rsi", label: "RSI (14)", kind: "pane", group: "Momentum" },
  { key: "stoch", label: "Stochastic (14,3,3)", kind: "pane", group: "Momentum" },
  { key: "adx", label: "ADX (14) +DI/-DI", kind: "pane", group: "Momentum" },
  { key: "cci", label: "CCI (20)", kind: "pane", group: "Momentum" },
  { key: "aroon", label: "Aroon (14)", kind: "pane", group: "Momentum" },
  { key: "atr", label: "ATR (14)", kind: "pane", group: "Volatility" },
  { key: "mfi", label: "MFI (14)", kind: "pane", group: "Volume", needsVolume: true },
  { key: "obv", label: "OBV", kind: "pane", group: "Volume", needsVolume: true },
];

export type LineSpec = { name: string; color: string; values: number[]; width?: 1 | 2 | 3; /** Draw as dots, no connecting line. */ dots?: boolean };
export type HistSpec = { name: string; values: number[]; upColor: string; downColor: string };
export type IndicatorOutput = {
  key: ChartIndicatorKey;
  label: string;
  lines: LineSpec[];
  hist?: HistSpec;
  /** Horizontal guide levels for panes (e.g. RSI 30/70). */
  levels?: number[];
};

const C = { blue: "#2563eb", amber: "#d97706", violet: "#7c3aed", teal: "#0d9488", rose: "#e11d48", emerald: "#059669", slate: "#64748b", orange: "#ea580c" };

export function isAvailable(meta: ChartIndicatorMeta, intraday: boolean, hasVolume: boolean): boolean {
  if (meta.needsVolume && !hasVolume) return false;
  if (meta.intradayOnly && !intraday) return false;
  return true;
}

export function computeIndicator(key: ChartIndicatorKey, bars: Bar[]): IndicatorOutput | null {
  const close = bars.map((b) => b.c);
  const label = CHART_INDICATORS.find((i) => i.key === key)?.label ?? key;
  const out = (o: Omit<IndicatorOutput, "key" | "label">): IndicatorOutput => ({ key, label, ...o });
  switch (key) {
    case "ema20": return out({ lines: [{ name: "EMA 20", color: C.blue, values: emaStd(close, 20) }] });
    case "ema50": return out({ lines: [{ name: "EMA 50", color: C.amber, values: emaStd(close, 50) }] });
    case "ema200": return out({ lines: [{ name: "EMA 200", color: C.rose, values: emaStd(close, 200), width: 2 }] });
    case "sma20": return out({ lines: [{ name: "SMA 20", color: C.teal, values: sma(close, 20) }] });
    case "ichimoku": {
      const ic = ichimoku(bars);
      return out({ lines: [
        { name: "Tenkan", color: C.blue, values: ic.tenkan },
        { name: "Kijun", color: C.rose, values: ic.kijun },
        { name: "Cloud top", color: C.emerald, values: ic.cloudTop },
        { name: "Cloud bottom", color: C.orange, values: ic.cloudBottom },
      ] });
    }
    case "psar": return out({ lines: [{ name: "PSAR", color: C.slate, values: psar(bars).sar, dots: true }] });
    case "sma50": return out({ lines: [{ name: "SMA 50", color: C.violet, values: sma(close, 50) }] });
    case "sma200": return out({ lines: [{ name: "SMA 200", color: C.slate, values: sma(close, 200), width: 2 }] });
    case "bb": {
      const b = bollinger(close, 20, 2);
      return out({ lines: [{ name: "BB upper", color: C.teal, values: b.upper }, { name: "BB mid", color: C.slate, values: b.mid }, { name: "BB lower", color: C.teal, values: b.lower }] });
    }
    case "supertrend": return out({ lines: [{ name: "Supertrend", color: C.orange, values: supertrend(bars, 10, 3).line, width: 2 }] });
    case "vwap": return out({ lines: [{ name: "VWAP", color: C.violet, values: sessionVwap(bars), width: 2 }] });
    case "macd": {
      const m = macd(close);
      return out({
        lines: [{ name: "MACD", color: C.blue, values: m.line }, { name: "Signal", color: C.orange, values: m.signal }],
        hist: { name: "Histogram", values: m.hist, upColor: "#34d39988", downColor: "#fb718588" },
      });
    }
    case "rsi": return out({ lines: [{ name: "RSI", color: C.violet, values: rsi(close, 14) }], levels: [30, 70] });
    case "stoch": {
      const s = stochastic(bars);
      return out({ lines: [{ name: "%K", color: C.blue, values: s.k }, { name: "%D", color: C.orange, values: s.d }], levels: [20, 80] });
    }
    case "adx": {
      const a = adx(bars, 14);
      return out({ lines: [{ name: "ADX", color: C.slate, values: a.adx, width: 2 }, { name: "+DI", color: C.emerald, values: a.plusDI }, { name: "-DI", color: C.rose, values: a.minusDI }], levels: [20] });
    }
    case "cci": return out({ lines: [{ name: "CCI", color: C.teal, values: cci(bars, 20) }], levels: [-100, 100] });
    case "aroon": {
      const a = aroon(bars, 14);
      return out({ lines: [{ name: "Aroon up", color: C.emerald, values: a.up }, { name: "Aroon down", color: C.rose, values: a.down }], levels: [50] });
    }
    case "atr": return out({ lines: [{ name: "ATR", color: C.amber, values: atr(bars, 14) }] });
    case "mfi": return out({ lines: [{ name: "MFI", color: C.teal, values: mfi(bars, 14) }], levels: [20, 80] });
    case "obv": return out({ lines: [{ name: "OBV", color: C.blue, values: obv(bars) }] });
    default: return null;
  }
}

/** Trade Lab card id -> chart indicators to plot when the card is clicked. */
export function chartKeysForReading(id: string): ChartIndicatorKey[] {
  switch (id) {
    case "ema": return ["ema20", "ema50", "ema200"];
    case "sma": return ["sma20", "sma50", "sma200"];
    case "bb": case "supertrend": case "ichimoku": case "psar": case "vwap": case "rsi": case "macd": case "stoch": case "adx":
    case "cci": case "aroon": case "atr": case "mfi": case "obv":
      return [id as ChartIndicatorKey];
    default: return [];
  }
}

export const DEFAULT_CHART_INDICATORS: ChartIndicatorKey[] = ["ema20", "ema50", "macd"];
