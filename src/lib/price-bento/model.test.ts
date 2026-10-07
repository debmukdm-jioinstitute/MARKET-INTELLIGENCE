import { describe, expect, it } from "vitest";
import {
  chartHeading,
  derivePrevClose,
  dailyMove,
  fmtChange,
  fmtPctNum,
  fmtValue,
  heroWords,
  nearestIndex,
  plotDomain,
  rangeDirection,
  rangeMarker,
  takeaway,
  usSessionOpen,
} from "./model";

describe("dailyMove — fixtures from the design brief (NOT production data)", () => {
  it("down", () => {
    const m = dailyMove(13131.05, 13149.46)!;
    expect(m.direction).toBe("down");
    expect(m.change).toBeCloseTo(-18.41, 2);
    expect(fmtPctNum(m.changePct, m.direction)).toBe("−0.14%");
    expect(takeaway(m)).toBe("Down 0.14% from the previous close.");
    expect(heroWords("closed", m.direction)).toEqual(["Closed", "lower."]);
  });
  it("up", () => {
    const m = dailyMove(13217.35, 13149.46)!;
    expect(m.direction).toBe("up");
    expect(fmtPctNum(m.changePct, m.direction)).toBe("+0.52%");
    expect(takeaway(m)).toBe("Up 0.52% from the previous close.");
    expect(heroWords("open", m.direction)).toEqual(["Trading", "higher."]);
  });
  it("unchanged incl. signed zero / float dust", () => {
    for (const [c, p] of [[100, 100], [0.1 + 0.2, 0.3]] as const) {
      const m = dailyMove(c, p)!;
      expect(m.direction).toBe("flat");
      expect(Object.is(m.change, -0)).toBe(false);
      expect(fmtPctNum(m.changePct, m.direction)).toBe("0.00%");
    }
    expect(takeaway(dailyMove(5, 5))).toBe("Unchanged from the previous close.");
  });
  it("direction uses unrounded change, not the rounded % string", () => {
    const m = dailyMove(100.0001, 100)!; // +0.0001% rounds to 0.00
    expect(m.direction).toBe("up");
    expect(fmtPctNum(m.changePct, m.direction)).toBe("+0.00%");
  });
  it("null / NaN / zero prev close are never coerced to 0", () => {
    expect(dailyMove(null, 10)).toBeNull();
    expect(dailyMove(10, undefined)).toBeNull();
    expect(dailyMove(NaN, 10)).toBeNull();
    expect(dailyMove(10, 0)!.changePct).toBeNull();
    expect(takeaway(null)).toMatch(/Not enough data/);
  });
});

describe("rangeMarker", () => {
  it("positions by (v-low)/(high-low) and clamps", () => {
    expect(rangeMarker(13131.05, 13131.05, 13217.35)).toBe(0);
    expect(rangeMarker(13217.35, 13131.05, 13217.35)).toBe(1);
    expect(rangeMarker(150, 100, 200)).toBe(0.5);
    expect(rangeMarker(500, 100, 200)).toBe(1);
    expect(rangeMarker(1, 100, 200)).toBe(0);
  });
  it("equal bounds → centre; missing close → null", () => {
    expect(rangeMarker(10, 10, 10)).toBe(0.5);
    expect(rangeMarker(null, 1, 2)).toBeNull();
  });
});

describe("formatting by unit", () => {
  it("index = points, inr = ₹, usd = $, true minus sign", () => {
    expect(fmtChange(-18.41, "index")).toBe("−18.41 points");
    expect(fmtChange(-18.41, "inr")).toBe("−₹18.41");
    expect(fmtChange(1.2, "usd")).toBe("+$1.20");
    expect(fmtChange(0, "index")).toBe("0.00 points");
    expect(fmtValue(13131.05, "index")).toBe("13,131.05");
    expect(fmtValue(1234567.5, "inr")).toBe("₹12,34,567.50"); // Indian grouping
    expect(fmtValue(1234567.5, "usd")).toBe("$1,234,567.50");
    expect(fmtValue(null, "inr")).toBe("—");
  });
});

describe("chart helpers", () => {
  it("heading per range", () => {
    expect(chartHeading("1D")).toBe("The day, in one line.");
    expect(chartHeading("1Y")).toBe("The year, in one line.");
  });
  it("domain always includes the previous-close baseline", () => {
    const d = plotDomain([{ t: 1, v: 100 }, { t: 2, v: 101 }], 90)!;
    expect(d.min).toBeLessThan(90);
    expect(d.max).toBeGreaterThan(101);
    expect(plotDomain([], 1)).toBeNull();
  });
  it("flat series still yields a non-degenerate domain", () => {
    const d = plotDomain([{ t: 1, v: 5 }, { t: 2, v: 5 }])!;
    expect(d.max).toBeGreaterThan(d.min);
  });
  it("rangeDirection + nearestIndex", () => {
    expect(rangeDirection([{ t: 1, v: 5 }, { t: 2, v: 4 }])).toBe("down");
    expect(rangeDirection([{ t: 1, v: 5 }])).toBe("flat");
    expect(nearestIndex(5, 0)).toBe(0);
    expect(nearestIndex(5, 1)).toBe(4);
    expect(nearestIndex(5, 0.5)).toBe(2);
    expect(nearestIndex(1, 0.9)).toBe(0);
  });
  it("US session needs weekday hours AND fresh data", () => {
    const wedNoonET = Date.parse("2026-10-07T16:00:00Z"); // 12:00 ET (EDT)
    expect(usSessionOpen(wedNoonET - 60_000, wedNoonET)).toBe(true);
    expect(usSessionOpen(wedNoonET - 3 * 3600_000, wedNoonET)).toBe(false);
    const sat = Date.parse("2026-10-10T16:00:00Z");
    expect(usSessionOpen(sat - 1000, sat)).toBe(false);
    expect(usSessionOpen(null, wedNoonET)).toBe(false);
  });
});

describe("derivePrevClose", () => {
  it("prefers explicit prevClose, then price − change", () => {
    expect(derivePrevClose({ price: 100, prevClose: 90, change: 1 })).toBe(90);
    expect(derivePrevClose({ price: 702.75, change: -8.7 })).toBeCloseTo(711.45, 2);
  });
  it("Yahoo fallback with change=0 but real changePct must NOT read as unchanged", () => {
    const prev = derivePrevClose({ price: 702.75, change: 0, changePct: -0.01223 })!;
    expect(prev).toBeCloseTo(711.45, 1);
    expect(dailyMove(702.75, prev)!.direction).toBe("down");
  });
  it("genuinely unchanged → price", () => {
    expect(derivePrevClose({ price: 50, change: 0, changePct: 0 })).toBe(50);
  });
  it("missing everything → null", () => {
    expect(derivePrevClose({ price: 50 })).toBeNull();
    expect(derivePrevClose({ price: NaN, change: 1 })).toBeNull();
  });
});
