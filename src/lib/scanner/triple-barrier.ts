import type { Bar } from "./types";

/**
 * Triple-barrier labeling (López de Prado, "Advances in Financial Machine Learning", ch. 3):
 * a real trade doesn't sit still until a fixed close N sessions out — it's stopped out or
 * takes profit whenever price first touches one of two volatility-scaled barriers, or is
 * closed at the vertical (time) barrier if neither is touched first. Scoring predictions
 * against this instead of a naive `close[t+horizon] vs close[t]` return matters here because
 * the naive version silently credits a "win" that would have been stopped out days earlier at
 * a real loss, and blames a "loss" on a move that would have already banked a real profit —
 * exactly the kind of quiet overstatement a "highest success ratio" claim would otherwise ride
 * on. Barrier width is ATR-scaled (not a fixed %) so it adapts to each instrument's own
 * volatility instead of one width fitted to whichever index happened to be tuned on.
 */

export type BarrierOutcome = {
  /** Realized return to the exit price, signed (positive = price rose). */
  ret: number;
  /** Which barrier fired first. */
  exit: "upper" | "lower" | "vertical";
  /** Sessions held until exit (<= horizon). */
  holdDays: number;
};

export type TripleBarrierOpts = {
  /** Profit-take distance in units of ATR(14)/close at entry. López de Prado's default is symmetric 1:1; kept configurable for sensitivity checks. */
  ptMult?: number;
  /** Stop-loss distance in units of ATR(14)/close at entry. */
  slMult?: number;
};

/**
 * Outcome of a long position opened at bars[t].c, using bars[t+1 .. t+horizon]'s real
 * high/low to detect the first barrier touch (causal — only looks forward from `t`, which is
 * exactly what a live position does; this is only ever used to score/label a `t` whose actual
 * outcome is already in the past by the time it's evaluated, never to see the future of the
 * live "now" bar). Returns null if there isn't a full `horizon` bars of history after `t`.
 */
export function tripleBarrierOutcome(
  bars: Bar[],
  atrAtT: number,
  t: number,
  horizon: number,
  opts: TripleBarrierOpts = {},
): BarrierOutcome | null {
  if (t + horizon >= bars.length || t < 0) return null;
  const ptMult = opts.ptMult ?? 1.5;
  const slMult = opts.slMult ?? 1.5;
  const entry = bars[t].c;
  if (!Number.isFinite(atrAtT) || atrAtT <= 0 || !Number.isFinite(entry) || entry <= 0) return null;

  const upper = entry + ptMult * atrAtT;
  const lower = entry - slMult * atrAtT;

  for (let j = t + 1; j <= t + horizon; j++) {
    const bar = bars[j];
    // Both barriers touched intrabar (rare, wide bar): resolve against the close's own
    // direction — the honest "we don't know which hit first from OHLC alone" call — rather
    // than silently picking the profit side.
    const hitUpper = bar.h >= upper;
    const hitLower = bar.l <= lower;
    if (hitUpper && hitLower) {
      const ret = bar.c >= entry ? upper / entry - 1 : lower / entry - 1;
      return { ret, exit: bar.c >= entry ? "upper" : "lower", holdDays: j - t };
    }
    if (hitUpper) return { ret: upper / entry - 1, exit: "upper", holdDays: j - t };
    if (hitLower) return { ret: lower / entry - 1, exit: "lower", holdDays: j - t };
  }

  const vertClose = bars[t + horizon].c;
  return { ret: vertClose / entry - 1, exit: "vertical", holdDays: horizon };
}

export function annualizedSharpe(periodReturns: number[], periodsPerYear: number): number | null {
  const xs = periodReturns.filter(Number.isFinite);
  if (xs.length < 20) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(xs.length - 1, 1);
  const sd = Math.sqrt(variance);
  if (sd === 0) return null;
  return (mean / sd) * Math.sqrt(periodsPerYear);
}

/** Max peak-to-trough drawdown of an equity curve, as a negative %. */
export function maxDrawdownPct(equity: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of equity) {
    peak = Math.max(peak, v);
    if (peak > 0) worst = Math.min(worst, v / peak - 1);
  }
  return worst * 100;
}

/**
 * Wilson score interval for a binomial proportion (Wilson, 1927) — the standard correction for
 * a plain normal-approximation CI, which is unreliable exactly where this page's smallest
 * lean-hit-rate samples live (n in the tens, p pushed toward the calibrated extremes). Returns
 * a 95% CI as [lo, hi] in the same 0–100 scale as the hit rate itself.
 */
export function wilsonInterval(hits: number, n: number, z = 1.96): { lo: number; hi: number } {
  if (n <= 0) return { lo: 0, hi: 0 };
  const p = hits / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { lo: Math.max(0, ((center - margin) / denom) * 100), hi: Math.min(100, ((center + margin) / denom) * 100) };
}
