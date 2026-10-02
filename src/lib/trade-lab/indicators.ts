import { atr, cci, mfi, rsi, sma, aroon, psar, ichimoku, trueRange } from "@/lib/scanner/indicators";
import type { Bar } from "@/lib/scanner/types";

export { atr, cci, mfi, rsi, sma, aroon, psar, ichimoku };

const nan = (n: number) => Array<number>(n).fill(NaN);

/** Standard EMA: seeded with the SMA of the first `n` finite values (TradingView / TA-Lib convention). */
export function emaStd(xs: number[], n: number): number[] {
  const out = nan(xs.length);
  const k = 2 / (n + 1);
  let count = 0;
  let sum = 0;
  let prev = NaN;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (!Number.isFinite(x)) continue;
    if (!Number.isFinite(prev)) {
      sum += x;
      count++;
      if (count === n) {
        prev = sum / n;
        out[i] = prev;
      }
    } else {
      prev = x * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export function macd(close: number[], fast = 12, slow = 26, signal = 9) {
  const f = emaStd(close, fast);
  const s = emaStd(close, slow);
  const line = close.map((_, i) => f[i] - s[i]);
  const sig = emaStd(line, signal);
  const hist = line.map((v, i) => v - sig[i]);
  return { line, signal: sig, hist };
}

export function bollinger(close: number[], n = 20, mult = 2) {
  const mid = sma(close, n);
  const upper = nan(close.length);
  const lower = nan(close.length);
  const pctB = nan(close.length);
  const bandwidth = nan(close.length);
  for (let i = n - 1; i < close.length; i++) {
    let v = 0;
    for (let j = i - n + 1; j <= i; j++) v += (close[j] - mid[i]) ** 2;
    const sd = Math.sqrt(v / n); // population stdev, as in TradingView / TA-Lib
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
    pctB[i] = upper[i] === lower[i] ? 0.5 : (close[i] - lower[i]) / (upper[i] - lower[i]);
    bandwidth[i] = mid[i] === 0 ? NaN : (upper[i] - lower[i]) / mid[i];
  }
  return { mid, upper, lower, pctB, bandwidth };
}

export function stochastic(bars: Bar[], kLen = 14, kSmooth = 3, dSmooth = 3) {
  const raw = nan(bars.length);
  for (let i = kLen - 1; i < bars.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kLen + 1; j <= i; j++) {
      hh = Math.max(hh, bars[j].h);
      ll = Math.min(ll, bars[j].l);
    }
    raw[i] = hh === ll ? 50 : (100 * (bars[i].c - ll)) / (hh - ll);
  }
  const k = sma(raw.map((v) => (Number.isFinite(v) ? v : 0)), kSmooth).map((v, i) => (i >= kLen - 1 + kSmooth - 1 ? v : NaN));
  const d = nan(bars.length);
  for (let i = 0; i < bars.length; i++) {
    if (i < dSmooth - 1) continue;
    let s = 0;
    let ok = true;
    for (let j = i - dSmooth + 1; j <= i; j++) {
      if (!Number.isFinite(k[j])) ok = false;
      s += k[j];
    }
    if (ok) d[i] = s / dSmooth;
  }
  return { k, d };
}

/** Wilder ADX with +DI / −DI. */
export function adx(bars: Bar[], n = 14) {
  const len = bars.length;
  const adxOut = nan(len);
  const plusDI = nan(len);
  const minusDI = nan(len);
  if (len <= n * 2) return { adx: adxOut, plusDI, minusDI };
  const tr = trueRange(bars);
  const pdm = nan(len);
  const mdm = nan(len);
  for (let i = 1; i < len; i++) {
    const up = bars[i].h - bars[i - 1].h;
    const dn = bars[i - 1].l - bars[i].l;
    pdm[i] = up > dn && up > 0 ? up : 0;
    mdm[i] = dn > up && dn > 0 ? dn : 0;
  }
  let sTR = 0;
  let sP = 0;
  let sM = 0;
  for (let i = 1; i <= n; i++) {
    sTR += tr[i];
    sP += pdm[i];
    sM += mdm[i];
  }
  const dx = nan(len);
  const setDI = (i: number) => {
    plusDI[i] = sTR === 0 ? 0 : (100 * sP) / sTR;
    minusDI[i] = sTR === 0 ? 0 : (100 * sM) / sTR;
    const tot = plusDI[i] + minusDI[i];
    dx[i] = tot === 0 ? 0 : (100 * Math.abs(plusDI[i] - minusDI[i])) / tot;
  };
  setDI(n);
  for (let i = n + 1; i < len; i++) {
    sTR = sTR - sTR / n + tr[i];
    sP = sP - sP / n + pdm[i];
    sM = sM - sM / n + mdm[i];
    setDI(i);
  }
  let prev = 0;
  for (let i = n; i < 2 * n; i++) prev += dx[i];
  prev /= n;
  adxOut[2 * n - 1] = prev;
  for (let i = 2 * n; i < len; i++) {
    prev = (prev * (n - 1) + dx[i]) / n;
    adxOut[i] = prev;
  }
  return { adx: adxOut, plusDI, minusDI };
}

/** Supertrend (ATR period, multiplier). `dir` = 1 uptrend (line below price), −1 downtrend. */
export function supertrend(bars: Bar[], period = 10, mult = 3) {
  const len = bars.length;
  const line = nan(len);
  const dir = nan(len);
  const a = atr(bars, period);
  let finalUp = NaN;
  let finalDn = NaN;
  let d = 1;
  for (let i = 0; i < len; i++) {
    if (!Number.isFinite(a[i])) continue;
    const mid = (bars[i].h + bars[i].l) / 2;
    const basicUp = mid - mult * a[i];
    const basicDn = mid + mult * a[i];
    const prevClose = i > 0 ? bars[i - 1].c : bars[i].c;
    finalUp = !Number.isFinite(finalUp) || basicUp > finalUp || prevClose < finalUp ? basicUp : finalUp;
    finalDn = !Number.isFinite(finalDn) || basicDn < finalDn || prevClose > finalDn ? basicDn : finalDn;
    if (d === 1 && bars[i].c < finalUp) d = -1;
    else if (d === -1 && bars[i].c > finalDn) d = 1;
    dir[i] = d;
    line[i] = d === 1 ? finalUp : finalDn;
  }
  return { line, dir };
}

/** On-balance volume. */
export function obv(bars: Bar[]): number[] {
  const out = nan(bars.length);
  let acc = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i > 0) acc += bars[i].c > bars[i - 1].c ? bars[i].v : bars[i].c < bars[i - 1].c ? -bars[i].v : 0;
    out[i] = acc;
  }
  return out;
}

const IST_OFFSET = 19_800; // +05:30 in seconds
const istDay = (t: number) => Math.floor((t + IST_OFFSET) / 86_400);

/** Session VWAP (resets each IST trading day) from typical price × volume. Intraday only — meaningless on daily bars. */
export function sessionVwap(bars: Bar[]): number[] {
  const out = nan(bars.length);
  let pv = 0;
  let vv = 0;
  let day = -1;
  for (let i = 0; i < bars.length; i++) {
    const dnow = istDay(bars[i].t);
    if (dnow !== day) {
      day = dnow;
      pv = 0;
      vv = 0;
    }
    pv += ((bars[i].h + bars[i].l + bars[i].c) / 3) * bars[i].v;
    vv += bars[i].v;
    out[i] = vv > 0 ? pv / vv : NaN;
  }
  return out;
}
