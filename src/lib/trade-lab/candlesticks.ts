import type { Bar } from "@/lib/scanner/types";
import type { Bias, PatternHit } from "./types";

/**
 * Rule-based candlestick detection (thresholds follow Nison's textbook definitions).
 * Every rule is geometry on OHLC — no model, no inference. Looks at the last `lookback` bars.
 */

const body = (b: Bar) => Math.abs(b.c - b.o);
const range = (b: Bar) => b.h - b.l;
const upper = (b: Bar) => b.h - Math.max(b.o, b.c);
const lower = (b: Bar) => Math.min(b.o, b.c) - b.l;
const bull = (b: Bar) => b.c > b.o;
const bear = (b: Bar) => b.c < b.o;
const f = (n: number) => n.toFixed(2);

function avgBody(bars: Bar[], i: number, n = 10) {
  let s = 0;
  let c = 0;
  for (let j = Math.max(0, i - n); j < i; j++) {
    s += body(bars[j]);
    c++;
  }
  return c ? s / c : body(bars[i]);
}

/** Short trend into bar i: compares close[i-1] with close[i-6]. */
function priorTrend(bars: Bar[], i: number): "down" | "up" | "flat" {
  if (i < 6) return "flat";
  const a = bars[i - 6].c;
  const b = bars[i - 1].c;
  const chg = (b - a) / a;
  if (chg < -0.01) return "down";
  if (chg > 0.01) return "up";
  return "flat";
}

type Rule = (bars: Bar[], i: number) => Omit<PatternHit, "barsAgo" | "time"> | null;

const mk = (
  id: string,
  name: string,
  bias: Bias,
  rule: string,
  numbers: string[],
  why: string,
  confidence: PatternHit["confidence"],
): Omit<PatternHit, "barsAgo" | "time"> => ({ id, name, kind: "candlestick", bias, rule, numbers, why, confidence });

const RULES: Rule[] = [
  // Doji: body ≤ 10% of range
  (bars, i) => {
    const b = bars[i];
    if (range(b) <= 0 || body(b) > 0.1 * range(b)) return null;
    return mk("doji", "Doji", "neutral", "Body ≤ 10% of the candle's high–low range.", [`body ${f(body(b))}`, `range ${f(range(b))}`], "Buyers and sellers ended level — indecision, often a pause before a turn.", "low");
  },
  // Hammer: small body upper end, lower shadow ≥ 2× body, tiny upper shadow, after a decline
  (bars, i) => {
    const b = bars[i];
    if (range(b) <= 0 || body(b) === 0) return null;
    if (lower(b) >= 2 * body(b) && upper(b) <= 0.3 * body(b) + 1e-9 && priorTrend(bars, i) === "down") {
      return mk("hammer", "Hammer", "bullish", "After a decline: lower shadow ≥ 2× body and upper shadow ≤ 30% of body.", [`lower shadow ${f(lower(b))}`, `body ${f(body(b))}`], "Sellers pushed price down but buyers drove it back up — possible bottom.", "medium");
    }
    return null;
  },
  // Inverted hammer: mirror, after decline
  (bars, i) => {
    const b = bars[i];
    if (range(b) <= 0 || body(b) === 0) return null;
    if (upper(b) >= 2 * body(b) && lower(b) <= 0.3 * body(b) + 1e-9 && priorTrend(bars, i) === "down") {
      return mk("inverted-hammer", "Inverted hammer", "bullish", "After a decline: upper shadow ≥ 2× body and lower shadow ≤ 30% of body.", [`upper shadow ${f(upper(b))}`, `body ${f(body(b))}`], "Buyers tried a rally from the lows; needs a green candle next to confirm.", "low");
    }
    return null;
  },
  // Shooting star: after advance
  (bars, i) => {
    const b = bars[i];
    if (range(b) <= 0 || body(b) === 0) return null;
    if (upper(b) >= 2 * body(b) && lower(b) <= 0.3 * body(b) + 1e-9 && priorTrend(bars, i) === "up") {
      return mk("shooting-star", "Shooting star", "bearish", "After an advance: upper shadow ≥ 2× body and lower shadow ≤ 30% of body.", [`upper shadow ${f(upper(b))}`, `body ${f(body(b))}`], "Rally was rejected hard — possible top.", "medium");
    }
    return null;
  },
  // Bullish engulfing
  (bars, i) => {
    if (i < 1) return null;
    const p = bars[i - 1];
    const b = bars[i];
    if (bear(p) && bull(b) && b.o <= p.c && b.c >= p.o && body(b) > body(p) && priorTrend(bars, i) !== "up") {
      return mk("bullish-engulfing", "Bullish engulfing", "bullish", "Green body fully covers the prior red body, after a non-rising market.", [`prior body ${f(body(p))}`, `engulfing body ${f(body(b))}`], "Buyers overwhelmed the previous session's sellers.", "medium");
    }
    return null;
  },
  // Bearish engulfing
  (bars, i) => {
    if (i < 1) return null;
    const p = bars[i - 1];
    const b = bars[i];
    if (bull(p) && bear(b) && b.o >= p.c && b.c <= p.o && body(b) > body(p) && priorTrend(bars, i) !== "down") {
      return mk("bearish-engulfing", "Bearish engulfing", "bearish", "Red body fully covers the prior green body, after a non-falling market.", [`prior body ${f(body(p))}`, `engulfing body ${f(body(b))}`], "Sellers overwhelmed the previous session's buyers.", "medium");
    }
    return null;
  },
  // Morning star
  (bars, i) => {
    if (i < 2) return null;
    const a = bars[i - 2];
    const m = bars[i - 1];
    const c = bars[i];
    const ab = avgBody(bars, i - 2);
    if (bear(a) && body(a) > ab && body(m) < 0.5 * body(a) && bull(c) && c.c > (a.o + a.c) / 2 && priorTrend(bars, i - 1) === "down") {
      return mk("morning-star", "Morning star", "bullish", "Long red candle, small-bodied star, then green candle closing above the first candle's midpoint — after a decline.", [`close ${f(c.c)}`, `first midpoint ${f((a.o + a.c) / 2)}`], "Three-candle bottom reversal: selling faded, buyers took over.", "high");
    }
    return null;
  },
  // Evening star
  (bars, i) => {
    if (i < 2) return null;
    const a = bars[i - 2];
    const m = bars[i - 1];
    const c = bars[i];
    const ab = avgBody(bars, i - 2);
    if (bull(a) && body(a) > ab && body(m) < 0.5 * body(a) && bear(c) && c.c < (a.o + a.c) / 2 && priorTrend(bars, i - 1) === "up") {
      return mk("evening-star", "Evening star", "bearish", "Long green candle, small-bodied star, then red candle closing below the first candle's midpoint — after an advance.", [`close ${f(c.c)}`, `first midpoint ${f((a.o + a.c) / 2)}`], "Three-candle top reversal: buying faded, sellers took over.", "high");
    }
    return null;
  },
  // Three white soldiers
  (bars, i) => {
    if (i < 2) return null;
    const [a, b, c] = [bars[i - 2], bars[i - 1], bars[i]];
    const ab = avgBody(bars, i - 2);
    if ([a, b, c].every(bull) && b.c > a.c && c.c > b.c && b.o > a.o && b.o < a.c && c.o > b.o && c.o < b.c && [a, b, c].every((x) => body(x) > 0.6 * ab) && upper(c) < body(c) * 0.5) {
      return mk("three-white-soldiers", "Three white soldiers", "bullish", "Three consecutive green candles, each opening inside the prior body and closing higher, with small upper shadows.", [`closes ${f(a.c)} → ${f(b.c)} → ${f(c.c)}`], "Steady, strong buying across three sessions.", "high");
    }
    return null;
  },
  // Three black crows
  (bars, i) => {
    if (i < 2) return null;
    const [a, b, c] = [bars[i - 2], bars[i - 1], bars[i]];
    const ab = avgBody(bars, i - 2);
    if ([a, b, c].every(bear) && b.c < a.c && c.c < b.c && b.o < a.o && b.o > a.c && c.o < b.o && c.o > b.c && [a, b, c].every((x) => body(x) > 0.6 * ab) && lower(c) < body(c) * 0.5) {
      return mk("three-black-crows", "Three black crows", "bearish", "Three consecutive red candles, each opening inside the prior body and closing lower, with small lower shadows.", [`closes ${f(a.c)} → ${f(b.c)} → ${f(c.c)}`], "Steady, strong selling across three sessions.", "high");
    }
    return null;
  },
];

export function detectCandlesticks(bars: Bar[], lookback = 5): PatternHit[] {
  const out: PatternHit[] = [];
  const start = Math.max(0, bars.length - lookback);
  for (let i = bars.length - 1; i >= start; i--) {
    for (const rule of RULES) {
      const hit = rule(bars, i);
      if (hit) out.push({ ...hit, barsAgo: bars.length - 1 - i, time: bars[i].t });
    }
  }
  return out;
}
