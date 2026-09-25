import type { Bar, Indicators } from "./types";

const nan = (n: number) => Array<number>(n).fill(NaN);

export function sma(xs: number[], n: number): number[] {
  const out = nan(xs.length);
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    sum += xs[i];
    if (i >= n) sum -= xs[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

export function ema(xs: number[], n: number): number[] {
  const out = nan(xs.length);
  const k = 2 / (n + 1);
  let prev = NaN;
  for (let i = 0; i < xs.length; i++) {
    if (!Number.isFinite(xs[i])) continue;
    prev = Number.isFinite(prev) ? xs[i] * k + prev * (1 - k) : xs[i];
    if (i >= n - 1) out[i] = prev;
  }
  return out;
}

/** Wilder-smoothed RSI. */
export function rsi(close: number[], n = 14): number[] {
  const out = nan(close.length);
  if (close.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = close[i] - close[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= n;
  loss /= n;
  out[n] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = n + 1; i < close.length; i++) {
    const d = close[i] - close[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function trueRange(bars: Bar[]): number[] {
  return bars.map((b, i) => (i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c))));
}

/** Wilder ATR. */
export function atr(bars: Bar[], n = 14): number[] {
  const tr = trueRange(bars);
  const out = nan(bars.length);
  if (bars.length < n) return out;
  let prev = tr.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = prev;
  for (let i = n; i < bars.length; i++) {
    prev = (prev * (n - 1) + tr[i]) / n;
    out[i] = prev;
  }
  return out;
}

export function cci(bars: Bar[], n = 20): number[] {
  const tp = bars.map((b) => (b.h + b.l + b.c) / 3);
  const out = nan(bars.length);
  for (let i = n - 1; i < bars.length; i++) {
    const w = tp.slice(i - n + 1, i + 1);
    const mean = w.reduce((a, b) => a + b, 0) / n;
    const md = w.reduce((a, b) => a + Math.abs(b - mean), 0) / n;
    out[i] = md === 0 ? 0 : (tp[i] - mean) / (0.015 * md);
  }
  return out;
}

export function mfi(bars: Bar[], n = 14): number[] {
  const tp = bars.map((b) => (b.h + b.l + b.c) / 3);
  const out = nan(bars.length);
  for (let i = n; i < bars.length; i++) {
    let pos = 0;
    let neg = 0;
    for (let j = i - n + 1; j <= i; j++) {
      const flow = tp[j] * bars[j].v;
      if (tp[j] > tp[j - 1]) pos += flow;
      else if (tp[j] < tp[j - 1]) neg += flow;
    }
    out[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
  }
  return out;
}

export function aroon(bars: Bar[], n = 14): { up: number[]; down: number[] } {
  const up = nan(bars.length);
  const down = nan(bars.length);
  for (let i = n; i < bars.length; i++) {
    let hi = i - n;
    let lo = i - n;
    for (let j = i - n; j <= i; j++) {
      if (bars[j].h >= bars[hi].h) hi = j;
      if (bars[j].l <= bars[lo].l) lo = j;
    }
    up[i] = (100 * (n - (i - hi))) / n;
    down[i] = (100 * (n - (i - lo))) / n;
  }
  return { up, down };
}

/** ATR trailing stop (ratcheting, multiplier × ATR below/above close depending on trend). */
export function atrTrailingStop(bars: Bar[], atrs: number[], mult = 3): number[] {
  const out = nan(bars.length);
  let stop = NaN;
  for (let i = 0; i < bars.length; i++) {
    if (!Number.isFinite(atrs[i])) continue;
    const c = bars[i].c;
    const loss = mult * atrs[i];
    if (!Number.isFinite(stop)) stop = c - loss;
    else if (c > stop && bars[i - 1].c > stop) stop = Math.max(stop, c - loss);
    else if (c < stop && bars[i - 1].c < stop) stop = Math.min(stop, c + loss);
    else stop = c > stop ? c - loss : c + loss;
    out[i] = stop;
  }
  return out;
}

/** Parabolic SAR (af 0.02 → 0.2). Returns SAR values and a bull flag (1 = SAR below price). */
export function psar(bars: Bar[], step = 0.02, max = 0.2): { sar: number[]; bull: number[] } {
  const n = bars.length;
  const sar = nan(n);
  const bull = nan(n);
  if (n < 3) return { sar, bull };
  let up = bars[1].c > bars[0].c;
  let ep = up ? bars[0].h : bars[0].l;
  let cur = up ? bars[0].l : bars[0].h;
  let af = step;
  sar[0] = cur;
  bull[0] = up ? 1 : 0;
  for (let i = 1; i < n; i++) {
    cur = cur + af * (ep - cur);
    if (up) {
      cur = Math.min(cur, bars[i - 1].l, i > 1 ? bars[i - 2].l : bars[i - 1].l);
      if (bars[i].l < cur) {
        up = false;
        cur = ep;
        ep = bars[i].l;
        af = step;
      } else if (bars[i].h > ep) {
        ep = bars[i].h;
        af = Math.min(af + step, max);
      }
    } else {
      cur = Math.max(cur, bars[i - 1].h, i > 1 ? bars[i - 2].h : bars[i - 1].h);
      if (bars[i].h > cur) {
        up = true;
        cur = ep;
        ep = bars[i].h;
        af = step;
      } else if (bars[i].l < ep) {
        ep = bars[i].l;
        af = Math.min(af + step, max);
      }
    }
    sar[i] = cur;
    bull[i] = up ? 1 : 0;
  }
  return { sar, bull };
}

function midpoint(bars: Bar[], n: number): number[] {
  const out = nan(bars.length);
  for (let i = n - 1; i < bars.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - n + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].h);
      lo = Math.min(lo, bars[j].l);
    }
    out[i] = (hi + lo) / 2;
  }
  return out;
}

/** Ichimoku (9/26/52). Cloud arrays are as plotted at each bar, i.e. computed 26 bars earlier. */
export function ichimoku(bars: Bar[]) {
  const tenkan = midpoint(bars, 9);
  const kijun = midpoint(bars, 26);
  const spanB = midpoint(bars, 52);
  const cloudTop = nan(bars.length);
  const cloudBottom = nan(bars.length);
  for (let i = 26; i < bars.length; i++) {
    const a = (tenkan[i - 26] + kijun[i - 26]) / 2;
    const b = spanB[i - 26];
    if (Number.isFinite(a) && Number.isFinite(b)) {
      cloudTop[i] = Math.max(a, b);
      cloudBottom[i] = Math.min(a, b);
    }
  }
  return { tenkan, kijun, cloudTop, cloudBottom };
}

export function computeIndicators(bars: Bar[]): Indicators {
  const close = bars.map((b) => b.c);
  const fast = ema(close, 12);
  const slow = ema(close, 26);
  const macd = close.map((_, i) => fast[i] - slow[i]);
  const macdSignal = ema(macd.map((v) => (Number.isFinite(v) ? v : NaN)), 9);
  const macdHist = macd.map((v, i) => v - macdSignal[i]);
  const a = atr(bars, 14);
  const ar = aroon(bars, 14);
  const ps = psar(bars);
  const ich = ichimoku(bars);
  return {
    sma50: sma(close, 50),
    sma150: sma(close, 150),
    sma200: sma(close, 200),
    psar: ps.sar,
    psarBull: ps.bull,
    tenkan: ich.tenkan,
    kijun: ich.kijun,
    cloudTop: ich.cloudTop,
    cloudBottom: ich.cloudBottom,
    rsi: rsi(close, 14),
    macd,
    macdSignal,
    macdHist,
    atr: a,
    cci: cci(bars, 20),
    mfi: mfi(bars, 14),
    aroonUp: ar.up,
    aroonDown: ar.down,
    atrStop: atrTrailingStop(bars, a, 3),
    volAvg20: sma(bars.map((b) => b.v), 20),
  };
}
