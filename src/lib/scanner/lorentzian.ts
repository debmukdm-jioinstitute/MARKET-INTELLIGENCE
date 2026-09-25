import { atr, cci, ema, rsi, sma } from "./indicators";
import type { Bar } from "./types";

/**
 * Lorentzian nearest-neighbour classifier (the approach behind PKScreener's Nifty prediction): each day is a feature
 * vector; the prediction for today is the up/down vote of the k most similar PAST days under the Lorentzian distance
 * Σ ln(1+|xᵢ−yᵢ|), which is robust to outlier features. Only days whose outcome is already known are eligible
 * neighbours, so there is no look-ahead.
 */
export const N_FEATURES = 7;

export type FeatureMatrix = Float64Array[]; // one row per bar; NaN rows where undefined

const clip = (x: number, lim: number) => Math.max(-lim, Math.min(lim, x));

/** Causal features per bar (volume-free so it works for indices too). Scaled to roughly [-1, 1]. */
export function buildFeatures(bars: Bar[]): FeatureMatrix {
  const close = bars.map((b) => b.c);
  const r = rsi(close, 14);
  const c = cci(bars, 20);
  const a = atr(bars, 14);
  const s20 = sma(close, 20);
  const s50 = sma(close, 50);
  const e12 = ema(close, 12);
  const e26 = ema(close, 26);
  return bars.map((b, i) => {
    const row = new Float64Array(N_FEATURES).fill(NaN);
    if (i < 50 || !Number.isFinite(r[i]) || !Number.isFinite(c[i]) || !Number.isFinite(a[i]) || !Number.isFinite(s50[i])) return row;
    row[0] = (r[i] - 50) / 50;
    row[1] = clip(c[i], 200) / 200;
    row[2] = clip((b.c / bars[i - 1].c - 1) * 100, 5) / 5;
    row[3] = clip((b.c / bars[i - 5].c - 1) * 100, 10) / 10;
    row[4] = clip(((b.c - s20[i]) / s20[i]) * 100, 10) / 10;
    row[5] = clip(((b.c - s50[i]) / s50[i]) * 100, 20) / 20;
    row[6] = clip(((e12[i] - e26[i]) / b.c) * 100, 3) / 3;
    return row;
  });
}

export interface Vote {
  pUp: number; // distance-weighted fraction of the k nearest past days that went up
  k: number;
  confidence: number; // |pUp − 0.5| × 2, in [0, 1]
}

/**
 * Predict whether the close `horizon` bars after bar `t` will be above bar t's close, using only history through t.
 * Neighbours are drawn from bars [t − lookback, t − horizon] (their outcome is known by t).
 * `stride` samples every n-th candidate to reduce autocorrelated near-duplicates (as in the original indicator).
 */
export function predict(bars: Bar[], feats: FeatureMatrix, t: number, opts: { horizon?: number; k?: number; lookback?: number; stride?: number } = {}): Vote | null {
  const horizon = opts.horizon ?? 1;
  const k = opts.k ?? 12;
  const lookback = opts.lookback ?? 1000;
  const stride = opts.stride ?? 1;
  const x = feats[t];
  if (!x || Number.isNaN(x[0])) return null;

  const first = Math.max(50, t - lookback);
  // keep the k nearest (smallest distance) neighbours with a small insertion buffer — avoids sorting every candidate
  const bestD: number[] = [];
  const bestUp: number[] = [];
  let seen = 0;
  for (let j = t - horizon; j >= first; j -= stride) {
    const y = feats[j];
    if (Number.isNaN(y[0])) continue;
    seen++;
    let d = 0;
    for (let f = 0; f < N_FEATURES; f++) d += Math.log(1 + Math.abs(x[f] - y[f]));
    if (bestD.length === k && d >= bestD[k - 1]) continue;
    let p = bestD.length < k ? bestD.length : k - 1;
    while (p > 0 && bestD[p - 1] > d) {
      bestD[p] = bestD[p - 1];
      bestUp[p] = bestUp[p - 1];
      p--;
    }
    bestD[p] = d;
    bestUp[p] = bars[j + horizon].c > bars[j].c ? 1 : 0;
  }
  if (seen < k * 3) return null;

  let wSum = 0;
  let wUp = 0;
  for (let n = 0; n < bestD.length; n++) {
    const w = 1 / (bestD[n] + 1e-6);
    wSum += w;
    wUp += w * bestUp[n];
  }
  const pUp = wUp / wSum;
  return { pUp, k, confidence: Math.abs(pUp - 0.5) * 2 };
}
