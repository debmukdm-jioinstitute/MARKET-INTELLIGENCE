import { describe, expect, it } from "vitest";
import type { Bar } from "@/lib/scanner/types";
import { detectCandlesticks } from "../candlesticks";
import { bollinger, emaStd, macd, obv, rsi, stochastic } from "../indicators";
import { runBacktest } from "../backtest";

const bar = (o: number, h: number, l: number, c: number, v = 1000, t = 0): Bar => ({ t, o, h, l, c, v });

describe("indicators — textbook reference values", () => {
  // StockCharts RSI(14) worked example
  const close = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64];
  it("RSI(14) matches the Wilder example", () => {
    const r = rsi(close, 14);
    expect(r[14]).toBeCloseTo(70.46, 1);
    expect(r[15]).toBeCloseTo(66.25, 1);
    expect(r[19]).toBeCloseTo(57.92, 1);
  });
  it("EMA is seeded with the SMA of the first n values", () => {
    const e = emaStd([1, 2, 3, 4, 5, 6], 3);
    expect(e[2]).toBeCloseTo(2, 10);
    expect(e[3]).toBeCloseTo(3, 10); // 4*0.5 + 2*0.5
    expect(Number.isNaN(e[1])).toBe(true);
  });
  it("MACD signal starts 9 values after the MACD line", () => {
    const xs = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5 + i * 0.2);
    const m = macd(xs);
    expect(Number.isNaN(m.line[24])).toBe(true);
    expect(Number.isFinite(m.line[25])).toBe(true);
    expect(Number.isNaN(m.signal[32])).toBe(true);
    expect(Number.isFinite(m.signal[33])).toBe(true);
    expect(m.hist[40]).toBeCloseTo(m.line[40] - m.signal[40], 10);
  });
  it("Bollinger bands collapse on constant prices and %B centres", () => {
    const b = bollinger(Array(30).fill(50), 20, 2);
    expect(b.upper[29]).toBe(50);
    expect(b.pctB[29]).toBe(0.5);
  });
  it("Stochastic %K is 100 when close sits at the 14-bar high", () => {
    const bars = Array.from({ length: 30 }, (_, i) => bar(i, i + 1, i - 1, i + 1));
    const s = stochastic(bars, 14, 1, 1);
    expect(s.k[29]).toBeCloseTo(100, 6);
  });
  it("OBV adds volume on up closes, subtracts on down closes", () => {
    const o = obv([bar(1, 1, 1, 10, 5), bar(1, 1, 1, 11, 7), bar(1, 1, 1, 9, 3)]);
    expect(o).toEqual([0, 7, 4]);
  });
});

describe("candlestick rules", () => {
  const downtrend = Array.from({ length: 8 }, (_, i) => bar(110 - i * 2, 111 - i * 2, 108 - i * 2, 108 - i * 2));
  it("flags a hammer after a decline", () => {
    const hits = detectCandlesticks([...downtrend, bar(94, 94.5, 88, 94.4)], 1);
    expect(hits.map((h) => h.id)).toContain("hammer");
  });
  it("flags bullish engulfing", () => {
    const hits = detectCandlesticks([...downtrend, bar(95, 95.2, 93, 93.5), bar(93, 97.5, 92.8, 97)], 1);
    expect(hits.map((h) => h.id)).toContain("bullish-engulfing");
  });
  it("does not flag a hammer in an uptrend", () => {
    const up = Array.from({ length: 8 }, (_, i) => bar(100 + i * 2, 102 + i * 2, 99 + i * 2, 101 + i * 2));
    const hits = detectCandlesticks([...up, bar(116, 116.3, 110, 116.2)], 1);
    expect(hits.map((h) => h.id)).not.toContain("hammer");
  });
});

describe("backtest", () => {
  it("never enters on the signal bar (no look-ahead) and respects costs", () => {
    const bars = Array.from({ length: 260 }, (_, i) => bar(100 + i * 0.5, 101 + i * 0.5, 99 + i * 0.5, 100.5 + i * 0.5, 1000 + (i % 7 === 0 ? 5000 : 0), 1_700_000_000 + i * 86_400));
    const r = runBacktest("TEST", "trend", bars);
    expect(r.period.bars).toBe(260);
    for (const t of r.recent) expect(t.entryT).toBeGreaterThan(bars[0].t);
    expect(r.exitRule).toContain("0.10%");
  });
});
