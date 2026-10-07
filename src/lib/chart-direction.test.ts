import { describe, expect, it } from "vitest";
import { computeChartMove } from "./chart-direction";

describe("computeChartMove (invariant: 1D colour follows previous close)", () => {
  it("1D: day closed down vs prev close ⇒ red even if intraday series rose from open", () => {
    // Nifty Bank: prev close 55,127.5; last 55,055.55 (−0.13%); series opened lower (54,8xx) and rose.
    const m = computeChartMove([54_850, 55_100, 55_055.55], {
      isIntraday: true,
      quote: { price: 55_055.55, change: -71.95 },
    })!;
    expect(m.isUp).toBe(false);
    expect(m.change).toBeCloseTo(-71.95, 2);
    expect(m.changePct).toBeCloseTo(-0.0013, 4);
  });
  it("1D: up vs prev close ⇒ green", () => {
    expect(computeChartMove([1, 2], { isIntraday: true, quote: { price: 101, change: 1 } })!.isUp).toBe(true);
  });
  it("1D without quote falls back to first→last", () => {
    expect(computeChartMove([10, 9], { isIntraday: true })!.isUp).toBe(false);
  });
  it("1W/1M/1Y use first→last", () => {
    const m = computeChartMove([100, 90, 110], { isIntraday: false, quote: { price: 1, change: -5 } })!;
    expect(m.isUp).toBe(true);
    expect(m.change).toBe(10);
  });
  it("empty ⇒ null", () => expect(computeChartMove([], { isIntraday: true })).toBeNull());
});
