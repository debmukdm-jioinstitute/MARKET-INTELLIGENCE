import { describe, expect, it } from "vitest";
import { annualizedSharpe, maxDrawdownPct, tripleBarrierOutcome, wilsonInterval } from "./triple-barrier";
import type { Bar } from "./types";

function bar(t: number, o: number, h: number, l: number, c: number): Bar {
  return { t, o, h, l, c, v: 1_000 };
}

describe("tripleBarrierOutcome", () => {
  it("exits at the upper barrier when price touches it before the lower or vertical barrier", () => {
    // entry 100, ATR 2, ptMult/slMult default 1.5 -> upper 103, lower 97
    const bars: Bar[] = [
      bar(0, 100, 100, 100, 100), // t = entry
      bar(1, 100, 101, 99, 100),
      bar(2, 100, 104, 100, 103.5), // touches upper (103) here
      bar(3, 100, 105, 104, 104.5),
      bar(4, 100, 106, 105, 105.5),
    ];
    const out = tripleBarrierOutcome(bars, 2, 0, 4);
    expect(out).not.toBeNull();
    expect(out!.exit).toBe("upper");
    expect(out!.holdDays).toBe(2);
    expect(out!.ret).toBeCloseTo(3 / 100, 6);
  });

  it("exits at the lower barrier (stop-loss) when price falls through it first", () => {
    const bars: Bar[] = [
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 100, 96, 97), // touches lower (97) here
      bar(2, 100, 103, 97, 102),
      bar(3, 100, 104, 100, 103),
    ];
    const out = tripleBarrierOutcome(bars, 2, 0, 3);
    expect(out!.exit).toBe("lower");
    expect(out!.holdDays).toBe(1);
    expect(out!.ret).toBeCloseTo(-3 / 100, 6);
  });

  it("falls back to the vertical (time) barrier when neither price barrier is touched", () => {
    const bars: Bar[] = [
      bar(0, 100, 100, 100, 100),
      bar(1, 100, 101, 99.5, 100.5),
      bar(2, 100, 101.5, 99.8, 101),
    ];
    const out = tripleBarrierOutcome(bars, 2, 0, 2);
    expect(out!.exit).toBe("vertical");
    expect(out!.holdDays).toBe(2);
    expect(out!.ret).toBeCloseTo(1 / 100, 6);
  });

  it("returns null when there isn't a full horizon of bars remaining (no look-ahead beyond available data)", () => {
    const bars: Bar[] = [bar(0, 100, 100, 100, 100), bar(1, 100, 101, 99, 100.5)];
    expect(tripleBarrierOutcome(bars, 2, 0, 5)).toBeNull();
  });

  it("returns null for non-finite or non-positive ATR instead of dividing by zero / NaN", () => {
    const bars: Bar[] = [bar(0, 100, 100, 100, 100), bar(1, 100, 101, 99, 100.5), bar(2, 100, 101, 99, 100.5)];
    expect(tripleBarrierOutcome(bars, NaN, 0, 2)).toBeNull();
    expect(tripleBarrierOutcome(bars, 0, 0, 2)).toBeNull();
    expect(tripleBarrierOutcome(bars, -1, 0, 2)).toBeNull();
  });
});

describe("wilsonInterval", () => {
  it("brackets the observed rate and widens for smaller n at the same rate", () => {
    const small = wilsonInterval(6, 10); // 60% on n=10
    const large = wilsonInterval(60, 100); // 60% on n=100
    expect(small.lo).toBeLessThan(60);
    expect(small.hi).toBeGreaterThan(60);
    expect(large.lo).toBeLessThan(60);
    expect(large.hi).toBeGreaterThan(60);
    // Same observed rate, ten times the sample: the interval must be tighter, not wider.
    expect(large.hi - large.lo).toBeLessThan(small.hi - small.lo);
  });

  it("returns a degenerate 0-0 interval for n = 0 rather than NaN", () => {
    expect(wilsonInterval(0, 0)).toEqual({ lo: 0, hi: 0 });
  });
});

describe("annualizedSharpe", () => {
  it("returns null below the minimum sample size instead of an unstable estimate", () => {
    expect(annualizedSharpe([0.01, -0.005, 0.02], 252)).toBeNull();
  });

  it("is positive for a return series with positive mean and finite for realistic inputs", () => {
    const xs = Array.from({ length: 100 }, (_, i) => 0.001 + 0.01 * Math.sin(i));
    const s = annualizedSharpe(xs, 252);
    expect(s).not.toBeNull();
    expect(Number.isFinite(s!)).toBe(true);
    expect(s!).toBeGreaterThan(0);
  });
});

describe("maxDrawdownPct", () => {
  it("computes the largest peak-to-trough decline as a negative percentage", () => {
    const equity = [100, 120, 90, 95, 130, 80, 140];
    // Peak 120 -> trough 80 (after the later peak of 130) is the deepest: 80/130 - 1 = -38.46%
    expect(maxDrawdownPct(equity)).toBeCloseTo(-38.46, 1);
  });

  it("is 0 for a monotonically increasing equity curve", () => {
    expect(maxDrawdownPct([100, 110, 120, 130])).toBeCloseTo(0, 6);
  });
});
