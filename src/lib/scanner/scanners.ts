import type { Bar, Indicators, ScannerDef } from "./types";

const last = <T>(a: T[], k = 0): T => a[a.length - 1 - k];
const pct = (a: number, b: number) => ((a - b) / b) * 100;
const f = (n: number, d = 1) => n.toFixed(d);

const maxOf = (bars: Bar[], key: "h" | "l" | "c" | "v", from: number, to: number) => {
  let m = -Infinity;
  for (let i = from; i < to; i++) m = Math.max(m, bars[i][key]);
  return m;
};
const minOf = (bars: Bar[], key: "h" | "l" | "c" | "v", from: number, to: number) => {
  let m = Infinity;
  for (let i = from; i < to; i++) m = Math.min(m, bars[i][key]);
  return m;
};

/** Simple daily-OHLCV scanners modelled on PKScreener's (X > scanner) menu. Bars are oldest→newest. */
export const SCANNERS: ScannerDef[] = [
  {
    id: "high52w",
    label: "52-week high breakout",
    description: "Close above the highest high of the previous 52 weeks (today's breakout).",
    bias: "buy",
    test: (b) => {
      const n = b.length;
      const prior = maxOf(b, "h", Math.max(0, n - 253), n - 1);
      return last(b).c > prior ? `Closed ${f(pct(last(b).c, prior))}% above prior 52w high ${f(prior, 2)}` : null;
    },
  },
  {
    id: "low52w",
    label: "52-week low breakdown",
    description: "Close below the lowest low of the previous 52 weeks.",
    bias: "sell",
    test: (b) => {
      const n = b.length;
      const prior = minOf(b, "l", Math.max(0, n - 253), n - 1);
      return last(b).c < prior ? `Closed ${f(pct(prior, last(b).c))}% below prior 52w low ${f(prior, 2)}` : null;
    },
  },
  {
    id: "low10d",
    label: "10-day low breakout (sell)",
    description: "Close below the lowest low of the previous 10 sessions.",
    bias: "sell",
    test: (b) => {
      const n = b.length;
      const prior = minOf(b, "l", n - 11, n - 1);
      return last(b).c < prior ? `Below 10d low ${f(prior, 2)}` : null;
    },
  },
  {
    id: "volume-gainers",
    label: "Volume gainers",
    description: "Up on the day with volume at least 2× the 20-day average.",
    bias: "buy",
    test: (b, i) => {
      const ratio = last(b).v / last(i.volAvg20, 1);
      return last(b).c > last(b, 1).c && ratio >= 2 ? `Volume ${f(ratio)}× 20d avg, +${f(pct(last(b).c, last(b, 1).c), 2)}%` : null;
    },
  },
  {
    id: "up2pct-3d",
    label: "Up 2%+ over last 3 sessions",
    description: "Closed higher on each of the last 3 sessions and at least 2% above the close 3 sessions ago.",
    bias: "buy",
    test: (b) => {
      const c0 = last(b).c, c1 = last(b, 1).c, c2 = last(b, 2).c, c3 = last(b, 3).c;
      return c0 > c1 && c1 > c2 && c2 > c3 && c0 >= c3 * 1.02 ? `+${f(pct(c0, c3), 2)}% in 3 sessions` : null;
    },
  },
  {
    id: "nr4",
    label: "NR4 (narrowest range in 4 days)",
    description: "Today's high–low range is the narrowest of the last 4 sessions — volatility squeeze.",
    bias: "watch",
    test: (b) => {
      const r = (k: number) => b[b.length - 1 - k].h - b[b.length - 1 - k].l;
      return r(0) > 0 && r(0) < r(1) && r(0) < r(2) && r(0) < r(3) ? `Range ${f((r(0) / last(b).c) * 100, 2)}% of price` : null;
    },
  },
  {
    id: "nr7",
    label: "NR7 (narrowest range in 7 days)",
    description: "Today's range is the narrowest of the last 7 sessions.",
    bias: "watch",
    test: (b) => {
      const r = (k: number) => b[b.length - 1 - k].h - b[b.length - 1 - k].l;
      for (let k = 1; k < 7; k++) if (!(r(0) < r(k))) return null;
      return r(0) > 0 ? `Range ${f((r(0) / last(b).c) * 100, 2)}% of price` : null;
    },
  },
  {
    id: "rsi-oversold",
    label: "RSI oversold (< 30)",
    description: "14-day RSI below 30 — potential reversal watchlist.",
    bias: "watch",
    test: (_b, i) => (last(i.rsi) < 30 ? `RSI ${f(last(i.rsi))}` : null),
  },
  {
    id: "rsi-overbought",
    label: "RSI overbought (> 70)",
    description: "14-day RSI above 70.",
    bias: "watch",
    test: (_b, i) => (last(i.rsi) > 70 ? `RSI ${f(last(i.rsi))}` : null),
  },
  {
    id: "rsi-macd-bull",
    label: "Bullish RSI & MACD",
    description: "MACD above its signal with a positive, rising histogram and RSI between 55 and 80.",
    bias: "buy",
    test: (_b, i) => {
      const h0 = last(i.macdHist), h1 = last(i.macdHist, 1);
      return last(i.macd) > last(i.macdSignal) && h0 > 0 && h0 > h1 && last(i.rsi) >= 55 && last(i.rsi) <= 80
        ? `RSI ${f(last(i.rsi))}, MACD hist ${f(h0, 2)}`
        : null;
    },
  },
  {
    id: "macd-bear-cross",
    label: "MACD histogram cross below 0 (sell)",
    description: "MACD histogram turned negative today.",
    bias: "sell",
    test: (_b, i) => (last(i.macdHist, 1) >= 0 && last(i.macdHist) < 0 ? `MACD hist ${f(last(i.macdHist), 2)}` : null),
  },
  {
    id: "aroon-bull",
    label: "Bullish Aroon(14) crossover",
    description: "Aroon Up crossed above Aroon Down today.",
    bias: "buy",
    test: (_b, i) =>
      last(i.aroonUp, 1) <= last(i.aroonDown, 1) && last(i.aroonUp) > last(i.aroonDown) ? `Aroon up ${f(last(i.aroonUp), 0)} / down ${f(last(i.aroonDown), 0)}` : null,
  },
  {
    id: "atr-cross",
    label: "ATR trailing stop cross (buy)",
    description: "Close crossed above its 3×ATR(14) trailing stop today.",
    bias: "buy",
    test: (b, i) => (last(b, 1).c <= last(i.atrStop, 1) && last(b).c > last(i.atrStop) ? `Stop ${f(last(i.atrStop), 2)}` : null),
  },
  {
    id: "high-momentum",
    label: "High momentum (RSI, MFI, CCI)",
    description: "RSI ≥ 68, MFI ≥ 68 and CCI ≥ 100 together.",
    bias: "buy",
    test: (_b, i) =>
      last(i.rsi) >= 68 && last(i.mfi) >= 68 && last(i.cci) >= 100 ? `RSI ${f(last(i.rsi), 0)} · MFI ${f(last(i.mfi), 0)} · CCI ${f(last(i.cci), 0)}` : null,
  },
  {
    id: "higher-highs",
    label: "Higher highs, lows & closes",
    description: "Last 3 sessions each made a higher high, higher low and higher close.",
    bias: "buy",
    test: (b) => {
      for (let k = 0; k < 3; k++) {
        const cur = b[b.length - 1 - k], prev = b[b.length - 2 - k];
        if (!(cur.h > prev.h && cur.l > prev.l && cur.c > prev.c)) return null;
      }
      return "3 sessions of higher highs/lows/closes";
    },
  },
  {
    id: "consolidating",
    label: "Consolidating (≤ 10% range, 15 days)",
    description: "Highest close to lowest close over the last 15 sessions within 10%.",
    bias: "watch",
    test: (b) => {
      const n = b.length;
      const hi = maxOf(b, "c", n - 15, n), lo = minOf(b, "c", n - 15, n);
      return pct(hi, lo) <= 10 ? `15d range ${f(pct(hi, lo), 1)}%` : null;
    },
  },
  {
    id: "low-volume",
    label: "Lowest volume in 5 days",
    description: "Today's volume is the lowest of the last 5 sessions — early breakout setup.",
    bias: "watch",
    test: (b) => {
      const n = b.length;
      return last(b).v > 0 && last(b).v <= minOf(b, "v", n - 5, n) ? "Volume dry-up" : null;
    },
  },
];

export const SCANNER_IDS = SCANNERS.map((s) => s.id);
export type { Indicators };
