import type { Bar, ScannerDef } from "./types";

const pct = (a: number, b: number) => ((a - b) / b) * 100;
const f = (n: number, d = 1) => n.toFixed(d);

/** Max/min of bars[from..to] (inclusive) for one field. */
const maxOf = (bars: Bar[], key: "h" | "l" | "c" | "v", from: number, to: number) => {
  let m = -Infinity;
  for (let j = Math.max(0, from); j <= to; j++) m = Math.max(m, bars[j][key]);
  return m;
};
const minOf = (bars: Bar[], key: "h" | "l" | "c" | "v", from: number, to: number) => {
  let m = Infinity;
  for (let j = Math.max(0, from); j <= to; j++) m = Math.min(m, bars[j][key]);
  return m;
};
const range = (bars: Bar[], k: number, i: number) => bars[i - k].h - bars[i - k].l;

/** Confirmed swing pivots (5 bars each side) in bars[from..to]; only pivots ≥ 5 bars old are confirmed. */
function pivots(bars: Bar[], from: number, to: number, kind: "low" | "high"): number[] {
  const out: number[] = [];
  const key = kind === "low" ? "l" : "h";
  for (let j = Math.max(5, from); j <= to - 5; j++) {
    let ok = true;
    for (let k = j - 5; k <= j + 5 && ok; k++) {
      if (k === j) continue;
      if (kind === "low" ? bars[k][key] < bars[j][key] : bars[k][key] > bars[j][key]) ok = false;
    }
    if (ok) out.push(j);
  }
  return out;
}

/**
 * Daily-OHLCV scanners modelled on PKScreener's scanner menu. Every test reads only bars 0..i, so the same code
 * drives live scans and honest backtests. Indicators that need more history than exists are NaN, so comparisons
 * against them are false and the scanner simply doesn't fire.
 */
export const SCANNERS: ScannerDef[] = [
  {
    id: "high52w",
    label: "52-week high breakout",
    description: "Close above the highest high of the previous 52 weeks (today's breakout).",
    bias: "buy",
    test: (b, _d, i) => {
      if (i < 120) return null;
      const prior = maxOf(b, "h", i - 252, i - 1);
      return b[i].c > prior ? `Closed ${f(pct(b[i].c, prior))}% above prior 52w high ${f(prior, 2)}` : null;
    },
  },
  {
    id: "low52w",
    label: "52-week low breakdown",
    description: "Close below the lowest low of the previous 52 weeks.",
    bias: "sell",
    test: (b, _d, i) => {
      if (i < 120) return null;
      const prior = minOf(b, "l", i - 252, i - 1);
      return b[i].c < prior ? `Closed ${f(pct(prior, b[i].c))}% below prior 52w low ${f(prior, 2)}` : null;
    },
  },
  {
    id: "low10d",
    label: "10-day low breakout (sell)",
    description: "Close below the lowest low of the previous 10 sessions.",
    bias: "sell",
    test: (b, _d, i) => {
      const prior = minOf(b, "l", i - 10, i - 1);
      return b[i].c < prior ? `Below 10d low ${f(prior, 2)}` : null;
    },
  },
  {
    id: "volume-gainers",
    label: "Volume gainers",
    description: "Up on the day with volume at least 2× the 20-day average.",
    bias: "buy",
    test: (b, d, i) => {
      const ratio = b[i].v / d.volAvg20[i - 1];
      return b[i].c > b[i - 1].c && ratio >= 2 ? `Volume ${f(ratio)}× 20d avg, +${f(pct(b[i].c, b[i - 1].c), 2)}%` : null;
    },
  },
  {
    id: "up2pct-3d",
    label: "Up 2%+ over last 3 sessions",
    description: "Closed higher on each of the last 3 sessions and at least 2% above the close 3 sessions ago.",
    bias: "buy",
    test: (b, _d, i) => {
      const c0 = b[i].c, c1 = b[i - 1].c, c2 = b[i - 2].c, c3 = b[i - 3].c;
      return c0 > c1 && c1 > c2 && c2 > c3 && c0 >= c3 * 1.02 ? `+${f(pct(c0, c3), 2)}% in 3 sessions` : null;
    },
  },
  {
    id: "nr4",
    label: "NR4 (narrowest range in 4 days)",
    description: "Today's high–low range is the narrowest of the last 4 sessions — volatility squeeze.",
    bias: "watch",
    test: (b, _d, i) => {
      const r = (k: number) => range(b, k, i);
      return r(0) > 0 && r(0) < r(1) && r(0) < r(2) && r(0) < r(3) ? `Range ${f((r(0) / b[i].c) * 100, 2)}% of price` : null;
    },
  },
  {
    id: "nr7",
    label: "NR7 (narrowest range in 7 days)",
    description: "Today's range is the narrowest of the last 7 sessions.",
    bias: "watch",
    test: (b, _d, i) => {
      const r0 = range(b, 0, i);
      for (let k = 1; k < 7; k++) if (!(r0 < range(b, k, i))) return null;
      return r0 > 0 ? `Range ${f((r0 / b[i].c) * 100, 2)}% of price` : null;
    },
  },
  {
    id: "rsi-oversold",
    label: "RSI oversold (< 30)",
    description: "14-day RSI below 30 — potential reversal watchlist.",
    bias: "watch",
    test: (_b, d, i) => (d.rsi[i] < 30 ? `RSI ${f(d.rsi[i])}` : null),
  },
  {
    id: "rsi-overbought",
    label: "RSI overbought (> 70)",
    description: "14-day RSI above 70.",
    bias: "watch",
    test: (_b, d, i) => (d.rsi[i] > 70 ? `RSI ${f(d.rsi[i])}` : null),
  },
  {
    id: "rsi-macd-bull",
    label: "Bullish RSI & MACD",
    description: "MACD above its signal with a positive, rising histogram and RSI between 55 and 80.",
    bias: "buy",
    test: (_b, d, i) =>
      d.macd[i] > d.macdSignal[i] && d.macdHist[i] > 0 && d.macdHist[i] > d.macdHist[i - 1] && d.rsi[i] >= 55 && d.rsi[i] <= 80
        ? `RSI ${f(d.rsi[i])}, MACD hist ${f(d.macdHist[i], 2)}`
        : null,
  },
  {
    id: "macd-bear-cross",
    label: "MACD histogram cross below 0 (sell)",
    description: "MACD histogram turned negative today.",
    bias: "sell",
    test: (_b, d, i) => (d.macdHist[i - 1] >= 0 && d.macdHist[i] < 0 ? `MACD hist ${f(d.macdHist[i], 2)}` : null),
  },
  {
    id: "aroon-bull",
    label: "Bullish Aroon(14) crossover",
    description: "Aroon Up crossed above Aroon Down today.",
    bias: "buy",
    test: (_b, d, i) => (d.aroonUp[i - 1] <= d.aroonDown[i - 1] && d.aroonUp[i] > d.aroonDown[i] ? `Aroon up ${f(d.aroonUp[i], 0)} / down ${f(d.aroonDown[i], 0)}` : null),
  },
  {
    id: "atr-cross",
    label: "ATR trailing stop cross (buy)",
    description: "Close crossed above its 3×ATR(14) trailing stop today.",
    bias: "buy",
    test: (b, d, i) => (b[i - 1].c <= d.atrStop[i - 1] && b[i].c > d.atrStop[i] ? `Stop ${f(d.atrStop[i], 2)}` : null),
  },
  {
    id: "high-momentum",
    label: "High momentum (RSI, MFI, CCI)",
    description: "RSI ≥ 68, MFI ≥ 68 and CCI ≥ 100 together.",
    bias: "buy",
    test: (_b, d, i) => (d.rsi[i] >= 68 && d.mfi[i] >= 68 && d.cci[i] >= 100 ? `RSI ${f(d.rsi[i], 0)} · MFI ${f(d.mfi[i], 0)} · CCI ${f(d.cci[i], 0)}` : null),
  },
  {
    id: "higher-highs",
    label: "Higher highs, lows & closes",
    description: "Last 3 sessions each made a higher high, higher low and higher close.",
    bias: "buy",
    test: (b, _d, i) => {
      for (let k = 0; k < 3; k++) {
        const cur = b[i - k], prev = b[i - k - 1];
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
    test: (b, _d, i) => {
      const hi = maxOf(b, "c", i - 14, i), lo = minOf(b, "c", i - 14, i);
      return pct(hi, lo) <= 10 ? `15d range ${f(pct(hi, lo), 1)}%` : null;
    },
  },
  {
    id: "low-volume",
    label: "Lowest volume in 5 days",
    description: "Today's volume is the lowest of the last 5 sessions — early breakout setup.",
    bias: "watch",
    test: (b, _d, i) => (b[i].v > 0 && b[i].v <= minOf(b, "v", i - 4, i) ? "Volume dry-up" : null),
  },

  // ---- Research-validated ----
  {
    id: "dip-uptrend",
    label: "Oversold dip in an uptrend",
    description:
      "RSI(14) below 30 while the price is still above its 200-day average. The only rule that survived out-of-sample testing (see the research note on the Backtesting page); hold 3–5 sessions.",
    bias: "buy",
    test: (b, d, i) => (d.rsi[i] < 30 && b[i].c > d.sma200[i] ? `RSI ${f(d.rsi[i])} above 200DMA ${f(d.sma200[i], 1)}` : null),
  },

  // ---- Harder scanners ----
  {
    id: "vcp",
    label: "VCP (Minervini trend template)",
    description:
      "Stage-2 uptrend (price > 50 > 150 > 200-day averages, 200-day rising, ≥30% off the 52-week low, within 25% of the high) with three successively tighter 10-day ranges and drying volume.",
    bias: "buy",
    test: (b, d, i) => {
      if (i < 210) return null;
      const c = b[i].c;
      if (!(c > d.sma50[i] && d.sma50[i] > d.sma150[i] && d.sma150[i] > d.sma200[i] && d.sma200[i] > d.sma200[i - 20])) return null;
      const lo = minOf(b, "l", i - 251, i), hi = maxOf(b, "h", i - 251, i);
      if (!(c >= lo * 1.3 && c >= hi * 0.75)) return null;
      const w = (from: number, to: number) => (maxOf(b, "h", from, to) - minOf(b, "l", from, to)) / maxOf(b, "h", from, to);
      const w1 = w(i - 29, i - 20), w2 = w(i - 19, i - 10), w3 = w(i - 9, i);
      if (!(w1 > w2 && w2 > w3)) return null;
      let v10 = 0, v50 = 0;
      for (let k = 0; k < 50; k++) {
        v50 += b[i - k].v;
        if (k < 10) v10 += b[i - k].v;
      }
      return v10 / 10 < v50 / 50 ? `Ranges ${f(w1 * 100, 0)}% → ${f(w2 * 100, 0)}% → ${f(w3 * 100, 0)}%, volume drying` : null;
    },
  },
  {
    id: "golden-cross",
    label: "Golden cross (50 over 200 DMA)",
    description: "50-day average crossed above the 200-day average within the last 3 sessions.",
    bias: "buy",
    test: (_b, d, i) => {
      if (!(d.sma50[i] > d.sma200[i])) return null;
      for (let k = 1; k <= 3; k++) if (d.sma50[i - k] <= d.sma200[i - k]) return `50DMA ${f(d.sma50[i], 1)} > 200DMA ${f(d.sma200[i], 1)}`;
      return null;
    },
  },
  {
    id: "death-cross",
    label: "Death cross (50 under 200 DMA)",
    description: "50-day average crossed below the 200-day average within the last 3 sessions.",
    bias: "sell",
    test: (_b, d, i) => {
      if (!(d.sma50[i] < d.sma200[i])) return null;
      for (let k = 1; k <= 3; k++) if (d.sma50[i - k] >= d.sma200[i - k]) return `50DMA ${f(d.sma50[i], 1)} < 200DMA ${f(d.sma200[i], 1)}`;
      return null;
    },
  },
  {
    id: "inside-bar-bull",
    label: "Bullish inside bar",
    description: "Today's range is inside yesterday's and the stock closed higher — compression in an up move.",
    bias: "buy",
    test: (b, _d, i) => (b[i].h < b[i - 1].h && b[i].l > b[i - 1].l && b[i].c > b[i - 1].c ? "Inside bar, up close" : null),
  },
  {
    id: "inside-bar-bear",
    label: "Bearish inside bar",
    description: "Today's range is inside yesterday's and the stock closed lower.",
    bias: "sell",
    test: (b, _d, i) => (b[i].h < b[i - 1].h && b[i].l > b[i - 1].l && b[i].c < b[i - 1].c ? "Inside bar, down close" : null),
  },
  {
    id: "ichimoku-bull",
    label: "Ichimoku short-term bullish",
    description: "Tenkan crossed above Kijun within 3 sessions while price trades above the cloud.",
    bias: "buy",
    test: (b, d, i) => {
      if (!(b[i].c > d.cloudTop[i] && d.tenkan[i] > d.kijun[i])) return null;
      for (let k = 1; k <= 3; k++) if (d.tenkan[i - k] <= d.kijun[i - k]) return "Tenkan/Kijun bull cross above cloud";
      return null;
    },
  },
  {
    id: "psar-reversal-bull",
    label: "PSAR + RSI bullish reversal",
    description: "Parabolic SAR flipped below price today with RSI rising and still under 60.",
    bias: "buy",
    test: (_b, d, i) => (d.psarBull[i] === 1 && d.psarBull[i - 1] === 0 && d.rsi[i] > d.rsi[i - 1] && d.rsi[i] < 60 ? `SAR flipped, RSI ${f(d.rsi[i])}` : null),
  },
  {
    id: "psar-reversal-bear",
    label: "PSAR + RSI bearish reversal",
    description: "Parabolic SAR flipped above price today with RSI falling and still above 40.",
    bias: "sell",
    test: (_b, d, i) => (d.psarBull[i] === 0 && d.psarBull[i - 1] === 1 && d.rsi[i] < d.rsi[i - 1] && d.rsi[i] > 40 ? `SAR flipped, RSI ${f(d.rsi[i])}` : null),
  },
  {
    id: "double-bottom",
    label: "Double bottom breakout",
    description: "Two swing lows within 3% of each other, 10–50 sessions apart, with today's close breaking above the peak between them.",
    bias: "buy",
    test: (b, _d, i) => {
      if (i < 70) return null;
      const p = pivots(b, i - 60, i, "low");
      if (p.length < 2) return null;
      const [a, c] = [p[p.length - 2], p[p.length - 1]];
      if (c - a < 10 || c - a > 50 || Math.abs(b[a].l - b[c].l) / b[a].l > 0.03) return null;
      const neck = maxOf(b, "h", a, c);
      return b[i].c > neck && b[i - 1].c <= neck ? `Neckline ${f(neck, 2)} broken` : null;
    },
  },
  {
    id: "double-top",
    label: "Double top breakdown",
    description: "Two swing highs within 3% of each other, 10–50 sessions apart, with today's close breaking below the trough between them.",
    bias: "sell",
    test: (b, _d, i) => {
      if (i < 70) return null;
      const p = pivots(b, i - 60, i, "high");
      if (p.length < 2) return null;
      const [a, c] = [p[p.length - 2], p[p.length - 1]];
      if (c - a < 10 || c - a > 50 || Math.abs(b[a].h - b[c].h) / b[a].h > 0.03) return null;
      const neck = minOf(b, "l", a, c);
      return b[i].c < neck && b[i - 1].c >= neck ? `Neckline ${f(neck, 2)} broken` : null;
    },
  },
];

export const SCANNER_IDS = SCANNERS.map((s) => s.id);
