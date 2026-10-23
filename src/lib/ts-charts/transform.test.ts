import { describe, expect, it } from "vitest";
import { applyTf, downsample, indicatorStats, percentile, sliceRange } from "./transform";
import { fmtVal } from "./format";

const rows = [10, 20, null, 15, 30].map((v, i) => ({ date: `2024-01-0${i + 1}`, a: v }));

describe("applyTf", () => {
  it("rebases to 100 on first non-null and keeps nulls", () => {
    const o = applyTf(rows, ["a"], { type: "rebase" });
    expect(o.map((r) => r.a)).toEqual([100, 200, null, 150, 300]);
  });
  it("drawdown vs running peak", () => {
    const o = applyTf(rows, ["a"], { type: "drawdown" });
    expect(o[3].a).toBeCloseTo(-25);
    expect(o[4].a).toBe(0);
  });
  it("change / rolling use window", () => {
    expect(applyTf(rows, ["a"], { type: "change", window: 1 })[1].a).toBe(100);
    expect(applyTf(rows, ["a"], { type: "rolling", window: 2 })[0].a).toBeNull();
    expect(applyTf(rows, ["a"], { type: "rolling", window: 2 })[3].a).toBeCloseTo(-25);
    expect(applyTf(rows, ["a"], { type: "rolling", window: 2 })[4].a).toBeNull();
  });
  it("cumsum skips nulls", () => expect(applyTf(rows, ["a"], { type: "cumsum" }).map((r) => r.a)).toEqual([10, 30, null, 45, 75]));
  it("no tf is identity", () => expect(applyTf(rows, ["a"])).toBe(rows));
});

describe("helpers", () => {
  it("sliceRange", () => expect(sliceRange(rows, "2024-01-02", "2024-01-04")).toHaveLength(3));
  it("downsample keeps last and caps length", () => {
    const big = Array.from({ length: 5000 }, (_, i) => i);
    const d = downsample(big, 1500);
    expect(d.length).toBeLessThanOrEqual(1501);
    expect(d.at(-1)).toBe(4999);
  });
  it("percentile", () => expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3));
  it("indicatorStats position + records", () => {
    const pts = Array.from({ length: 24 }, (_, i) => ({ date: `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-15`, v: i }));
    pts.push({ date: "2025-01-15", v: 100 });
    const s = indicatorStats(pts)!;
    expect(s.position).toBe("above");
    expect(s.recHi.v).toBe(100);
    expect(s.recLo.v).toBe(0);
  });
});

describe("fmtVal", () => {
  it("formats", () => {
    expect(fmtVal(12.345, "pct", 1)).toBe("12.3%");
    expect(fmtVal(1234567, "crore")).toBe("₹12,34,567 cr");
    expect(fmtVal(null)).toBe("–");
    expect(fmtVal(21.6, "x")).toBe("21.6x");
    expect(fmtVal(NaN, "pct")).toBe("–");
  });
});
