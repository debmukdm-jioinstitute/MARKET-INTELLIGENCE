import { describe, expect, it } from "vitest";
import { REFERENCE_SNAPSHOT_FIXTURES } from "../fixtures";
import {
  computeRangePosition,
  formatLargeVolume,
  formatPrice,
  formatSignedPct,
  formatSignedPoints,
  getDirection,
  sortIndices,
} from "../utils";
import type { WorldIndexQuote } from "../types";

describe("Global Markets - calculations & utilities", () => {
  describe("computeRangePosition", () => {
    it("correctly computes S&P 500 reference fixture day range marker (~91%)", () => {
      // S&P 500 fixture: price 7,796.10, low 7,763.34, high 7,799.45
      const res = computeRangePosition(7796.10, 7763.34, 7799.45);
      expect(res.valid).toBe(true);
      expect(res.isOutside).toBe(false);
      expect(res.pct).toBeCloseTo(90.72, 1);
    });

    it("correctly computes S&P 500 reference fixture 52-week range marker (~97%)", () => {
      // S&P 500 fixture: price 7,796.10, low 6,316.91, high 7,844.52
      const res = computeRangePosition(7796.10, 6316.91, 7844.52);
      expect(res.valid).toBe(true);
      expect(res.isOutside).toBe(false);
      expect(res.pct).toBeCloseTo(96.83, 1);
    });

    it("clamps position to [0, 100] when quote exceeds high", () => {
      const res = computeRangePosition(8000, 7000, 7500);
      expect(res.valid).toBe(true);
      expect(res.pct).toBe(100);
      expect(res.isOutside).toBe(true);
    });

    it("clamps position to [0, 100] when quote falls below low", () => {
      const res = computeRangePosition(6500, 7000, 7500);
      expect(res.valid).toBe(true);
      expect(res.pct).toBe(0);
      expect(res.isOutside).toBe(true);
    });

    it("places marker at 50% when low equals high", () => {
      const res = computeRangePosition(7000, 7000, 7000);
      expect(res.valid).toBe(true);
      expect(res.pct).toBe(50);
      expect(res.isOutside).toBe(false);
    });

    it("returns invalid when bounds or current are missing", () => {
      expect(computeRangePosition(null, 100, 200).valid).toBe(false);
      expect(computeRangePosition(150, null, 200).valid).toBe(false);
      expect(computeRangePosition(150, 100, null).valid).toBe(false);
    });
  });

  describe("formatLargeVolume", () => {
    it("formats billions correctly with short and long descriptions", () => {
      const res = formatLargeVolume(1150000000);
      expect(res.short).toBe("1.15B");
      expect(res.long).toBe("1.15 billion");
    });

    it("formats millions correctly", () => {
      const res = formatLargeVolume(425300000);
      expect(res.short).toBe("425.30M");
      expect(res.long).toBe("425.30 million");
    });

    it("formats thousands correctly", () => {
      const res = formatLargeVolume(87500);
      expect(res.short).toBe("87.5K");
      expect(res.long).toBe("87.5 thousand");
    });

    it("handles null or zero volume honestly without inventing numbers", () => {
      expect(formatLargeVolume(null).short).toBe("—");
      expect(formatLargeVolume(null).long).toBe("Unavailable");
      expect(formatLargeVolume(0).short).toBe("—");
      expect(formatLargeVolume(-100).short).toBe("—");
    });
  });

  describe("getDirection", () => {
    it("identifies negative direction from raw points change", () => {
      expect(getDirection(-22.76, -0.0029)).toBe("down");
    });

    it("identifies positive direction", () => {
      expect(getDirection(45.2, 0.005)).toBe("up");
    });

    it("identifies flat session", () => {
      expect(getDirection(0, 0)).toBe("flat");
    });

    it("identifies unavailable state without guessing", () => {
      expect(getDirection(null, null)).toBe("unavailable");
    });
  });

  describe("formatting helpers", () => {
    it("formats price with commas and correct decimals", () => {
      expect(formatPrice(7796.1, 2)).toBe("7,796.10");
      expect(formatPrice(204720.1, 2)).toBe("204,720.10");
      expect(formatPrice(null, 2)).toBe("—");
    });

    it("formats signed points change explicitly", () => {
      expect(formatSignedPoints(-22.76, 2)).toBe("−22.76 points");
      expect(formatSignedPoints(15.5, 2)).toBe("+15.50 points");
      expect(formatSignedPoints(null)).toBe("—");
    });

    it("formats signed percentage change explicitly", () => {
      expect(formatSignedPct(-0.0029)).toBe("−0.29%");
      expect(formatSignedPct(0.0124)).toBe("+1.24%");
      expect(formatSignedPct(null)).toBe("—");
    });
  });

  describe("sortIndices", () => {
    const sampleItems: WorldIndexQuote[] = [
      {
        ...REFERENCE_SNAPSHOT_FIXTURES[0], // S&P 500 (7,796.10, -0.29%)
      },
      {
        ...REFERENCE_SNAPSHOT_FIXTURES[1], // Dow (51,174.13, -0.67%)
      },
      {
        ...REFERENCE_SNAPSHOT_FIXTURES[8], // S&P IPSA (price null, change null)
      },
    ];

    it("sorts by price descending with nulls placed at bottom", () => {
      const sorted = sortIndices(sampleItems, "price", "desc");
      expect(sorted[0].label).toBe("Dow Jones Industrial Average");
      expect(sorted[1].label).toBe("S&P 500");
      expect(sorted[2].label).toBe("S&P IPSA");
    });

    it("sorts by price ascending with nulls still placed at bottom", () => {
      const sorted = sortIndices(sampleItems, "price", "asc");
      expect(sorted[0].label).toBe("S&P 500");
      expect(sorted[1].label).toBe("Dow Jones Industrial Average");
      expect(sorted[2].label).toBe("S&P IPSA");
    });

    it("sorts by index name alphabetically", () => {
      const sorted = sortIndices(sampleItems, "index", "asc");
      expect(sorted[0].label).toBe("Dow Jones Industrial Average");
      expect(sorted[1].label).toBe("S&P 500");
      expect(sorted[2].label).toBe("S&P IPSA");
    });
  });
});
