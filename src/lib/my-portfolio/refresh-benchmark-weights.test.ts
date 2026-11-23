import { describe, expect, it } from "vitest";
import { MIN_LIVE_CAP_COVERAGE, tooFewLiveCapsError, weightsFromSymbols } from "@/lib/my-portfolio/refresh-benchmark-weights";

describe("weightsFromSymbols", () => {
  it("normalises live caps and keeps cap_yahoo", () => {
    const out = weightsFromSymbols(["AAA", "BBB"], new Map([["AAA", 75], ["BBB", 25]]));
    expect(out?.method).toBe("cap_yahoo");
    expect(out?.weights).toEqual({ AAA: 0.75, BBB: 0.25 });
  });

  it("refuses a basket below 90% live-cap coverage instead of equal-weighting", () => {
    const symbols = Array.from({ length: 10 }, (_, i) => `S${i}`);
    const caps = new Map(symbols.slice(0, 8).map((s) => [s, 1] as const));
    expect(weightsFromSymbols(symbols, caps)).toBeNull();
    expect(MIN_LIVE_CAP_COVERAGE).toBe(0.9);
    expect(tooFewLiveCapsError(10, 8)).toContain("8/10");
  });

  it("accepts exactly 90% coverage", () => {
    const symbols = Array.from({ length: 10 }, (_, i) => `S${i}`);
    const caps = new Map(symbols.slice(0, 9).map((s) => [s, 10] as const));
    expect(weightsFromSymbols(symbols, caps)?.method).toBe("cap_yahoo");
  });
});
