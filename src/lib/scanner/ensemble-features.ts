import { atr, cci, ema, rsi, sma } from "./indicators";
import type { Bar } from "./types";

/** Feature count for ridge / ensemble stack (Lorentzian keeps its own 7-feature space). */
export const ENSEMBLE_N_FEATURES = 12;

const clip = (x: number, lim: number) => Math.max(-lim, Math.min(lim, x));

/** Causal features for walk-forward logistic + blending (indices and equities). */
export function buildEnsembleFeatures(bars: Bar[]): Float64Array[] {
  const close = bars.map((b) => b.c);
  const r = rsi(close, 14);
  const c = cci(bars, 20);
  const a = atr(bars, 14);
  const s20 = sma(close, 20);
  const s50 = sma(close, 50);
  const e12 = ema(close, 12);
  const e26 = ema(close, 26);

  return bars.map((b, i) => {
    const row = new Float64Array(ENSEMBLE_N_FEATURES).fill(NaN);
    if (i < 63 || !Number.isFinite(r[i]) || !Number.isFinite(c[i]) || !Number.isFinite(a[i]) || !Number.isFinite(s50[i])) return row;

    row[0] = (r[i] - 50) / 50;
    row[1] = clip(c[i], 200) / 200;
    row[2] = clip((b.c / bars[i - 1].c - 1) * 100, 5) / 5;
    row[3] = clip((b.c / bars[i - 5].c - 1) * 100, 10) / 10;
    row[4] = clip((b.c / bars[i - 20].c - 1) * 100, 15) / 15;
    row[5] = clip((b.c / bars[i - 63].c - 1) * 100, 25) / 25;
    row[6] = clip(((b.c - s20[i]) / s20[i]) * 100, 10) / 10;
    row[7] = clip(((b.c - s50[i]) / s50[i]) * 100, 20) / 20;
    row[8] = clip((a[i] / b.c) * 100, 5) / 5;
    const macd = (e12[i] - e26[i]) / b.c;
    const macdPrev = i > 0 && Number.isFinite(e12[i - 1]) ? (e12[i - 1] - e26[i - 1]) / bars[i - 1].c : macd;
    row[9] = clip(macd * 100, 3) / 3;
    row[10] = clip((macd - macdPrev) * 100, 2) / 2;
    row[11] = clip((r[i] - r[i - 5]) / 50, 1);

    return row;
  });
}

/** Short-horizon momentum tilt in [0, 1]. */
export function momentumPUp(bars: Bar[], t: number): number {
  if (t < 21) return 0.5;
  let sum = 0;
  let sumSq = 0;
  for (let i = t - 19; i <= t; i++) {
    const ret = bars[i].c / bars[i - 1].c - 1;
    sum += ret;
    sumSq += ret * ret;
  }
  const mean = sum / 20;
  const var_ = Math.max(sumSq / 20 - mean * mean, 1e-8);
  const z = (bars[t].c / bars[t - 20].c - 1) / Math.sqrt(var_ * 20);
  return 0.5 + 0.22 * Math.tanh(z);
}

/** RSI mean-reversion tilt in [0, 1]. */
export function meanReversionPUp(rsiVal: number): number {
  if (!Number.isFinite(rsiVal)) return 0.5;
  if (rsiVal >= 72) return 0.28;
  if (rsiVal <= 28) return 0.72;
  return 0.5 + (50 - rsiVal) / 120;
}
