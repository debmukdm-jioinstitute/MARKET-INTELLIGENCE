import { describe, expect, it } from "vitest";
import type { Bar } from "@/lib/scanner/types";
import { detectChartPatterns } from "../chart-patterns";

/** Builds bars by walking a piecewise-linear close path through `knots` (each segment `seg` bars) with ±0.4% high/low wicks. */
function path(knots: number[], seg = 8, vol = 1000): Bar[] {
  const bars: Bar[] = [];
  let prev = knots[0];
  for (let k = 1; k < knots.length; k++) {
    for (let s = 1; s <= seg; s++) {
      const c = knots[k - 1] + ((knots[k] - knots[k - 1]) * s) / seg;
      bars.push({ t: bars.length * 86_400, o: prev, h: Math.max(prev, c) * 1.004, l: Math.min(prev, c) * 0.996, c, v: vol });
      prev = c;
    }
  }
  return bars;
}
const ids = (bars: Bar[]) => detectChartPatterns(bars).hits.map((h) => h.id);
const lead = [100, 100, 100]; // warm-up so ATR/pivots exist

describe("chart patterns on constructed geometry", () => {
  it("finds a double top and confirms on a close below the trough", () => {
    const bars = path([...lead, 120, 108, 120.5, 100, 99]);
    expect(ids(bars)).toContain("double-top");
  });
  it("finds a double bottom", () => {
    const bars = path([140, 120, 132, 120.5, 135, 138]);
    expect(ids(bars)).toContain("double-bottom");
  });
  it("finds head and shoulders", () => {
    const bars = path([100, 118, 108, 130, 108, 117, 106, 104]);
    expect(ids(bars)).toContain("head-shoulders");
  });
  it("finds inverse head and shoulders", () => {
    const bars = path([140, 122, 132, 110, 132, 123, 134, 137]);
    expect(ids(bars)).toContain("inverse-head-shoulders");
  });
  it("finds an ascending triangle (flat top, rising lows)", () => {
    const bars = path([100, 120, 106, 120, 110, 120, 114, 120, 117, 119]);
    expect(ids(bars)).toContain("ascending-triangle");
  });
  it("finds a descending triangle (flat floor, falling highs)", () => {
    const bars = path([140, 120, 134, 120, 130, 120, 126, 120, 123, 121]);
    expect(ids(bars)).toContain("descending-triangle");
  });
  it("flags a volume-confirmed breakout", () => {
    const flatBars = path([100, 101, 100, 101, 100, 101, 100, 101, 100, 101], 5);
    const brk: Bar = { t: flatBars.length * 86_400, o: 101, h: 106, l: 100.8, c: 105.5, v: 3000 };
    const hits = detectChartPatterns([...flatBars, brk]).hits;
    expect(hits.find((h) => h.id === "breakout")?.name).toContain("volume confirmed");
  });
  it("stays quiet on a straight-line trend (no reversal or triangle structure)", () => {
    const bars = path([100, 130], 60);
    const found = ids(bars).filter((i) => i !== "breakout");
    expect(found).toEqual([]);
  });
});
