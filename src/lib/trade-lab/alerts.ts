import type { LabResult } from "./types";

export interface LabEvent {
  key: string;
  symbol: string;
  tf: string;
  title: string;
  body: string;
  severity: "medium" | "info";
}

const num = (r: LabResult | null, id: string) => {
  const v = r?.indicators.find((i) => i.id === id)?.value;
  const n = v === undefined ? NaN : parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Transition events between two consecutive computations of the same symbol/timeframe.
 * Only fires on a change of state (RSI crossing 70/30, MACD flipping vs signal, a NEW volume-confirmed breakout/breakdown)
 * so a persistent condition never re-alerts.
 */
export function detectLabEvents(prev: LabResult | null, cur: LabResult): LabEvent[] {
  if (!prev || prev.asOf === cur.asOf) return []; // need a real earlier bar to compare
  const out: LabEvent[] = [];
  const base = { symbol: cur.symbol, tf: cur.tf };
  const stamp = cur.asOf;

  const r0 = num(prev, "rsi");
  const r1 = num(cur, "rsi");
  if (r0 !== null && r1 !== null) {
    if (r0 <= 70 && r1 > 70) out.push({ ...base, key: `tl:${cur.symbol}:${cur.tf}:rsi70:${stamp}`, severity: "medium", title: `${cur.symbol} RSI crossed above 70 (${cur.tf})`, body: `RSI ${r1.toFixed(1)} — overbought zone; price ${cur.price.last.toFixed(2)}.` });
    if (r0 >= 30 && r1 < 30) out.push({ ...base, key: `tl:${cur.symbol}:${cur.tf}:rsi30:${stamp}`, severity: "medium", title: `${cur.symbol} RSI fell below 30 (${cur.tf})`, body: `RSI ${r1.toFixed(1)} — oversold zone; price ${cur.price.last.toFixed(2)}.` });
  }
  const m0 = prev.indicators.find((i) => i.id === "macd")?.bias;
  const m1 = cur.indicators.find((i) => i.id === "macd")?.bias;
  if (m0 && m1 && m0 !== m1 && m1 !== "neutral") {
    out.push({ ...base, key: `tl:${cur.symbol}:${cur.tf}:macd:${m1}:${stamp}`, severity: "info", title: `${cur.symbol} MACD turned ${m1} (${cur.tf})`, body: `MACD line crossed ${m1 === "bullish" ? "above" : "below"} its signal line; price ${cur.price.last.toFixed(2)}.` });
  }
  const had = new Set(prev.patterns.filter((p) => p.id === "breakout" || p.id === "breakdown").map((p) => `${p.id}:${p.time}`));
  for (const p of cur.patterns) {
    if ((p.id === "breakout" || p.id === "breakdown") && p.confidence === "high" && p.barsAgo === 0 && !had.has(`${p.id}:${p.time}`)) {
      out.push({ ...base, key: `tl:${cur.symbol}:${cur.tf}:${p.id}:${p.time}`, severity: "medium", title: `${cur.symbol} ${p.id === "breakout" ? "breakout" : "breakdown"} on volume (${cur.tf})`, body: p.numbers.join(", ") + "." });
    }
  }
  return out;
}
