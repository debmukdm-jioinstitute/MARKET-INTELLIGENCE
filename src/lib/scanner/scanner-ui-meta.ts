/** Beginner-friendly groupings for the Nifty 500 scanner UI (maps to SCANNERS ids). */

export const SCANNER_START_HERE_IDS = ["high52w", "rsi-oversold", "volume-gainers", "up2pct-3d"] as const;

export type ScannerCategoryId = "breakouts" | "oversold" | "trend" | "volume";

export const SCANNER_CATEGORIES: {
  id: ScannerCategoryId;
  label: string;
  hint: string;
  scannerIds: string[];
}[] = [
  {
    id: "breakouts",
    label: "Price breakouts",
    hint: "New highs/lows and range breaks",
    scannerIds: ["high52w", "low52w", "low10d", "inside-bar-bull", "inside-bar-bear", "double-bottom", "double-top"],
  },
  {
    id: "oversold",
    label: "Oversold bounces",
    hint: "Pullback and squeeze setups",
    scannerIds: ["rsi-oversold", "dip-uptrend", "nr4", "nr7", "consolidating"],
  },
  {
    id: "trend",
    label: "Trend followers",
    hint: "Moving averages and momentum",
    scannerIds: [
      "golden-cross",
      "death-cross",
      "higher-highs",
      "high-momentum",
      "aroon-bull",
      "macd-bear-cross",
      "rsi-macd-bull",
      "ichimoku-bull",
      "vcp",
    ],
  },
  {
    id: "volume",
    label: "Volume spikes",
    hint: "Unusual activity vs recent average",
    scannerIds: ["volume-gainers", "low-volume", "atr-cross"],
  },
];

/** When a scan returns zero rows, suggest two broader scans from the same category. */
export const SCANNER_ZERO_FALLBACKS: Record<string, [string, string]> = {
  vcp: ["high52w", "high-momentum"],
  "ichimoku-bull": ["golden-cross", "high-momentum"],
  nr4: ["consolidating", "volume-gainers"],
  nr7: ["nr4", "consolidating"],
  "double-bottom": ["rsi-oversold", "dip-uptrend"],
  "double-top": ["rsi-overbought", "low52w"],
};

export function zeroResultSuggestions(activeId: string): string[] {
  const hit = SCANNER_ZERO_FALLBACKS[activeId];
  if (hit) return [...hit];
  return ["high52w", "volume-gainers"];
}
