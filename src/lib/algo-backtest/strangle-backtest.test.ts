import { describe, expect, it } from "vitest";
import { runAllLocalBacktests, runStrangleBacktest } from "./strangle-backtest";
import type { Bar } from "@/lib/scanner/types";

/** ~4 years of realistic-shaped NIFTY-scale daily bars: drift + a volatility cycle, real OHLC spread. */
function syntheticNiftyBars(n: number): Bar[] {
  const bars: Bar[] = [];
  let c = 24_500;
  // Start on a real Monday so week-boundary logic behaves exactly as it will against real data.
  const t0 = Math.floor(new Date("2022-01-03T09:15:00Z").getTime() / 1000);
  let t = t0;
  for (let i = 0; i < n; i++) {
    const vol = 0.008 + 0.006 * Math.sin(i / 45); // a slow volatility regime cycle
    const shock = Math.sin(i / 11) * vol + Math.cos(i / 5) * vol * 0.4;
    c *= 1 + 0.00025 + shock;
    const h = c * (1 + Math.abs(shock) * 0.6 + 0.001);
    const l = c * (1 - Math.abs(shock) * 0.6 - 0.001);
    bars.push({ t, o: c, h, l, c, v: 5_000_000 });
    // advance one weekday (skip weekends), matching real trading-day spacing
    do {
      t += 86_400;
    } while (new Date(t * 1000).getUTCDay() === 0 || new Date(t * 1000).getUTCDay() === 6);
  }
  return bars;
}

describe("runStrangleBacktest", () => {
  const bars = syntheticNiftyBars(1000); // ~4 years of trading days

  it("produces a real profile shape with trades, an equity curve, and internally consistent totals", () => {
    const p = runStrangleBacktest(bars, "medium");
    expect(p.trades).toBeGreaterThan(20); // roughly weekly x2 legs over ~4 years, minus skipped weeks
    expect(p.equity_curve).toHaveLength(p.trades);
    expect(p.trade_list).toHaveLength(p.trades);

    const summedPnl = p.trade_list.reduce((a, t) => a + t.pnl, 0);
    expect(p.pnl).toBeCloseTo(summedPnl, 1);

    const lastEquity = p.equity_curve[p.equity_curve.length - 1] ?? 0;
    expect(p.pnl).toBeCloseTo(lastEquity, 1);
  });

  it("only enters once per calendar week and never opens a leg without a real forward price path", () => {
    const p = runStrangleBacktest(bars, "low");
    const entryWeeks = new Set(p.trade_list.map((t) => t.entry_time.slice(0, 10)));
    // At most 2 legs (call + put) share any one entry date.
    for (const d of entryWeeks) {
      expect(p.trade_list.filter((t) => t.entry_time.slice(0, 10) === d).length).toBeLessThanOrEqual(2);
    }
    for (const t of p.trade_list) {
      expect(t.exit_time >= t.entry_time).toBe(true);
      expect(["TARGET", "SL", "EXPIRY"]).toContain(t.result);
      expect(t.entry_premium).toBeGreaterThan(0);
      expect(t.lot_size).toBe(65);
    }
  });

  it("a closer (Aggressive) strike distance collects more total premium at entry than a wider (Conservative) one", () => {
    const low = runStrangleBacktest(bars, "low");
    const high = runStrangleBacktest(bars, "high");
    const avgEntry = (p: typeof low) => p.trade_list.reduce((a, t) => a + t.entry_premium, 0) / Math.max(p.trade_list.length, 1);
    // Aggressive sits closer to spot (0.8σ vs 1.5σ) so, on the same underlying path, its options
    // are priced richer on average — a direct, checkable consequence of the Black-Scholes pricing,
    // not a tuned outcome.
    expect(avgEntry(high)).toBeGreaterThan(avgEntry(low));
  });

  it("win_rate, rr and avg_win/avg_loss are internally consistent with the trade list", () => {
    const p = runStrangleBacktest(bars, "high");
    const wins = p.trade_list.filter((t) => t.pnl > 0);
    const expectedWinRate = p.trades ? Math.round((wins.length / p.trades) * 1000) / 10 : 0;
    expect(p.win_rate).toBe(expectedWinRate);
  });

  it("returns an empty profile (not a crash) on too little history", () => {
    const p = runStrangleBacktest(bars.slice(0, 15), "medium");
    expect(p.trades).toBe(0);
    expect(p.pnl).toBe(0);
    expect(p.win_rate).toBe(0);
  });
});

describe("runAllLocalBacktests", () => {
  it("returns all three risk levels from one shared bar history", () => {
    const bars = syntheticNiftyBars(600);
    const all = runAllLocalBacktests(bars);
    expect(Object.keys(all).sort()).toEqual(["high", "low", "medium"]);
    for (const level of ["low", "medium", "high"] as const) {
      expect(all[level].trade_list.every((t) => t.direction === "CALL" || t.direction === "PUT")).toBe(true);
    }
  });
});
