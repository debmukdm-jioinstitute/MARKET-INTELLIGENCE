/**
 * Black-Scholes European option pricing, used to estimate NIFTY weekly-options premium from the
 * index's own real daily bars, since no historical NSE options-chain data source is available to
 * this app (only a live snapshot via Upstox — see src/lib/feeds/sources/upstox/option-chain.ts).
 * This is a standard, well-known substitute for backtesting an options strategy when real
 * historical option prices aren't available: it is NOT real historical option prices, and every
 * caller of this module must say so wherever a result reaches a user.
 */

const erf = (x: number): number => {
  // Abramowitz & Stegun 7.1.26 approximation, |error| <= 1.5e-7 — good enough for pricing, not
  // for anything that needs full double precision.
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
};

const normCdf = (x: number): number => 0.5 * (1 + erf(x / Math.SQRT2));

export type OptionGreeksInput = {
  spot: number;
  strike: number;
  /** Years to expiry (fractional), > 0. */
  t: number;
  /** Annualized volatility, e.g. 0.14 for 14%. */
  sigma: number;
  /** Annual risk-free rate, e.g. 0.065. */
  r?: number;
};

/** Black-Scholes price of a European call. Returns 0 if `t` or `sigma` is non-positive (expired/undefined). */
export function bsCall({ spot, strike, t, sigma, r = 0.065 }: OptionGreeksInput): number {
  if (t <= 0 || sigma <= 0 || spot <= 0 || strike <= 0) return Math.max(spot - strike, 0);
  const d1 = (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  return spot * normCdf(d1) - strike * Math.exp(-r * t) * normCdf(d2);
}

/** Black-Scholes price of a European put (via put-call parity). */
export function bsPut(input: OptionGreeksInput): number {
  const { spot, strike, t, r = 0.065 } = input;
  if (t <= 0) return Math.max(strike - spot, 0);
  return bsCall(input) - spot + strike * Math.exp(-r * t);
}

/**
 * Annualized realized volatility from trailing daily log returns, computed using only bars up to
 * and including index `i` (causal — no look-ahead, matching the rest of this app's walk-forward
 * convention). Returns null if there isn't a full window of history yet.
 */
export function realizedVolAt(closes: number[], i: number, window = 20): number | null {
  if (i < window) return null;
  const rets: number[] = [];
  for (let j = i - window + 1; j <= i; j++) {
    if (closes[j - 1] <= 0 || closes[j] <= 0) return null;
    rets.push(Math.log(closes[j] / closes[j - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(rets.length - 1, 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

/** Next NSE weekly-options expiry (Thursday) strictly after `fromEpochSec`, as epoch seconds at that day's close-ish hour. */
export function nextThursday(fromEpochSec: number): number {
  const d = new Date(fromEpochSec * 1000);
  const day = d.getUTCDay(); // 0 = Sun ... 4 = Thu
  let addDays = (4 - day + 7) % 7;
  if (addDays === 0) addDays = 7; // land on the *next* Thursday, not today
  return fromEpochSec + addDays * 86_400;
}
