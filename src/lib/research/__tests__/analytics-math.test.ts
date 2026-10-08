import { describe, expect, it } from "vitest";
import {
  avgCapitalEmployed,
  avgEquity,
  cagr,
  ccc,
  cfoToPat,
  debtToEquity,
  dio,
  dpo,
  dso,
  ebitdaMargin,
  ebitMargin,
  fcf,
  fcfMargin,
  grossMargin,
  interestCoverage,
  maxVal,
  mean,
  median,
  minVal,
  netDebt,
  netDebtToEbitda,
  normalizeCapex,
  patMargin,
  percentile,
  quartiles,
  roce,
  roe,
  safeDiv,
  yoy,
} from "../analytics-math";

const mkPeriods = (rows: Array<{ e?: number | null; d?: number | null }>) =>
  rows.map((r) => ({ totalEquity: r.e ?? null, totalDebt: r.d ?? null }));

describe("export contract", () => {
  it("exposes every required helper", () => {
    for (const fn of [
      safeDiv, cagr, yoy, grossMargin, ebitdaMargin, ebitMargin, patMargin, fcfMargin,
      avgEquity, avgCapitalEmployed, roe, roce, normalizeCapex, fcf,
      dso, dio, dpo, ccc, netDebt, netDebtToEbitda, debtToEquity, interestCoverage,
      cfoToPat, percentile, median, quartiles, minVal, maxVal, mean,
    ]) {
      expect(typeof fn).toBe("function");
    }
  });
});

describe("safeDiv", () => {
  it("divides finite numbers", () => {
    expect(safeDiv(10, 4)).toBe(2.5);
    expect(safeDiv(0, 5)).toBe(0);
  });
  it("returns null for zero, null, or non-finite inputs", () => {
    expect(safeDiv(10, 0)).toBeNull();
    expect(safeDiv(null, 4)).toBeNull();
    expect(safeDiv(10, null)).toBeNull();
    expect(safeDiv(NaN, 4)).toBeNull();
    expect(safeDiv(10, Infinity)).toBeNull();
  });
});

describe("cagr", () => {
  it("computes a hand-checked 3-value CAGR", () => {
    // (225/100)^(1/2) - 1 = 1.5 - 1 = 0.5
    expect(cagr([100, 150, 225])).toBeCloseTo(0.5, 10);
  });
  it("computes a 2-value CAGR", () => {
    // (121/100)^1 - 1 = 0.21
    expect(cagr([100, 121])).toBeCloseTo(0.21, 10);
  });
  it("rejects non-positive beginning values", () => {
    expect(cagr([0, 100, 200])).toBeNull();
    expect(cagr([-50, 100, 200])).toBeNull();
  });
  it("returns null with fewer than 2 finite values", () => {
    expect(cagr([])).toBeNull();
    expect(cagr([100])).toBeNull();
    expect(cagr([100, NaN])).toBeNull();
    expect(cagr([null, undefined])).toBeNull();
  });
  it("skips non-finite values in the middle", () => {
    // 100 -> 121 across one effective interval
    expect(cagr([100, NaN, 121])).toBeCloseTo(0.21, 10);
  });
  it("guards non-finite results", () => {
    // ratio -1 under a fractional exponent is NaN
    expect(cagr([100, 200, -100])).toBeNull();
  });
});

describe("yoy", () => {
  it("computes (cur - prev) / |prev|", () => {
    expect(yoy(120, 100)).toBe(0.2);
    expect(yoy(80, 100)).toBe(-0.2);
    expect(yoy(120, -100)).toBeCloseTo(2.2, 10);
  });
  it("returns null when prev is zero, null, or non-finite", () => {
    expect(yoy(120, 0)).toBeNull();
    expect(yoy(120, null)).toBeNull();
    expect(yoy(null, 100)).toBeNull();
    expect(yoy(120, NaN)).toBeNull();
  });
});

describe("margin helpers", () => {
  it("returns percent and null unless revenue > 0", () => {
    expect(grossMargin(40, 100)).toBe(40);
    expect(ebitdaMargin(25, 100)).toBe(25);
    expect(ebitMargin(20, 100)).toBe(20);
    expect(patMargin(15, 100)).toBe(15);
    expect(fcfMargin(10, 100)).toBe(10);
  });
  it("returns null for zero/negative/missing revenue or numerator", () => {
    expect(grossMargin(40, 0)).toBeNull();
    expect(grossMargin(40, -100)).toBeNull();
    expect(grossMargin(null, 100)).toBeNull();
    expect(patMargin(15, null)).toBeNull();
    expect(fcfMargin(10, NaN)).toBeNull();
  });
  it("handles negative numerators as negative margins", () => {
    expect(patMargin(-15, 100)).toBe(-15);
  });
});

describe("avgEquity / avgCapitalEmployed", () => {
  it("means finite totalEquity across periods", () => {
    expect(avgEquity(mkPeriods([{ e: 100 }, { e: 120 }]))).toBe(110);
    expect(avgEquity(mkPeriods([{ e: 100 }, { e: null }]))).toBe(100);
  });
  it("means finite (equity + debt) across periods", () => {
    expect(avgCapitalEmployed(mkPeriods([{ e: 100, d: 50 }, { e: 120, d: 60 }]))).toBe(165);
    // period with missing debt does not contribute
    expect(avgCapitalEmployed(mkPeriods([{ e: 100, d: 50 }, { e: 120 }]))).toBe(150);
  });
  it("returns null when no period contributes", () => {
    expect(avgEquity([])).toBeNull();
    expect(avgEquity(mkPeriods([{ e: null }]))).toBeNull();
    expect(avgCapitalEmployed(mkPeriods([{ e: null, d: 50 }]))).toBeNull();
  });
});

describe("roe", () => {
  it("computes ROE % with average equity", () => {
    expect(roe(20, 110)).toBeCloseTo(18.1818, 4);
  });
  it("returns null unless avgEq > 0", () => {
    expect(roe(20, 0)).toBeNull();
    expect(roe(20, -50)).toBeNull();
    expect(roe(null, 110)).toBeNull();
  });
});

describe("roce", () => {
  it("computes ROCE % with average capital employed", () => {
    expect(roce(30, 200)).toBe(15);
    expect(roce(-30, 200)).toBe(-15);
  });
  it("returns null unless avgCE > 0", () => {
    expect(roce(30, 0)).toBeNull();
    expect(roce(30, -10)).toBeNull();
    expect(roce(null, 200)).toBeNull();
  });
});

describe("normalizeCapex / fcf", () => {
  it("takes the absolute value of reported capex", () => {
    expect(normalizeCapex(-50)).toBe(50);
    expect(normalizeCapex(50)).toBe(50);
    expect(normalizeCapex(0)).toBe(0);
    expect(normalizeCapex(null)).toBeNull();
  });
  it("computes FCF with negative reported capex (no double subtraction)", () => {
    expect(fcf(100, normalizeCapex(-40))).toBe(60);
    expect(fcf(100, 40)).toBe(60);
    expect(fcf(100, null)).toBeNull();
    expect(fcf(null, 40)).toBeNull();
  });
});

describe("working capital days", () => {
  it("computes DSO/DIO/DPO in days", () => {
    expect(dso(91.25, 365)).toBe(91.25);
    expect(dio(50, 3650)).toBeCloseTo(5, 10);
    expect(dpo(100, 3650)).toBeCloseTo(10, 10);
  });
  it("returns null unless the denominator is positive", () => {
    expect(dso(100, 0)).toBeNull();
    expect(dio(50, 0)).toBeNull();
    expect(dio(null, 3650)).toBeNull();
    expect(dpo(100, -3650)).toBeNull();
  });
  it("computes CCC as DSO + DIO - DPO", () => {
    expect(ccc(30, 60, 40)).toBe(50);
    expect(ccc(30, null, 40)).toBeNull();
  });
});

describe("debt metrics", () => {
  it("computes net debt", () => {
    expect(netDebt(300, 120)).toBe(180);
    expect(netDebt(120, 300)).toBe(-180);
    expect(netDebt(300, null)).toBeNull();
  });
  it("computes net debt / EBITDA", () => {
    expect(netDebtToEbitda(180, 90)).toBe(2);
    expect(netDebtToEbitda(180, 0)).toBeNull();
    expect(netDebtToEbitda(null, 90)).toBeNull();
  });
  it("computes debt / equity with an equity > 0 guard", () => {
    expect(debtToEquity(300, 150)).toBe(2);
    expect(debtToEquity(300, 0)).toBeNull();
    expect(debtToEquity(300, -150)).toBeNull();
  });
  it("computes interest coverage with an interest > 0 guard", () => {
    expect(interestCoverage(30, 10)).toBe(3);
    expect(interestCoverage(30, 0)).toBeNull();
    expect(interestCoverage(30, -10)).toBeNull();
    expect(interestCoverage(null, 10)).toBeNull();
  });
});

describe("cfoToPat", () => {
  it("computes CFO / PAT", () => {
    expect(cfoToPat(116, 100)).toBe(1.16);
    expect(cfoToPat(64, 100)).toBe(0.64);
  });
  it("returns null unless PAT > 0", () => {
    expect(cfoToPat(116, 0)).toBeNull();
    expect(cfoToPat(116, -100)).toBeNull();
    expect(cfoToPat(null, 100)).toBeNull();
  });
});

describe("percentile", () => {
  it("interpolates linearly between order statistics", () => {
    // rank = 0.5 * 3 = 1.5 -> 20 + 0.5 * 10 = 25
    expect(percentile([10, 20, 30, 40], 50)).toBe(25);
  });
  it("computes q1/median/q3 on a known set", () => {
    expect(percentile([10, 20, 30, 40, 50], 25)).toBe(20);
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
    expect(percentile([10, 20, 30, 40, 50], 75)).toBe(40);
    expect(percentile([10, 20, 30, 40, 50], 0)).toBe(10);
    expect(percentile([10, 20, 30, 40, 50], 100)).toBe(50);
  });
  it("sorts before computing", () => {
    expect(percentile([50, 10, 30, 20, 40], 50)).toBe(30);
  });
  it("returns the single value and ignores non-finite entries", () => {
    expect(percentile([7], 50)).toBe(7);
    expect(percentile([10, NaN, 20, null, 30], 50)).toBe(20);
  });
  it("returns null for empty input", () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([null, NaN], 90)).toBeNull();
  });
});

describe("median / quartiles / min / max / mean", () => {
  it("median equals the 50th percentile", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
  it("quartiles return q1/median/q3", () => {
    expect(quartiles([10, 20, 30, 40, 50])).toEqual({ q1: 20, median: 30, q3: 40 });
    expect(quartiles([])).toEqual({ q1: null, median: null, q3: null });
  });
  it("min/max/mean over finite values only", () => {
    expect(minVal([3, 1, 2])).toBe(1);
    expect(maxVal([3, 1, 2])).toBe(3);
    expect(mean([3, 1, 2])).toBe(2);
    expect(mean([3, null, 1])).toBe(2);
    expect(minVal([])).toBeNull();
    expect(maxVal([NaN])).toBeNull();
    expect(mean([])).toBeNull();
  });
});

describe("empty input -> null everywhere", () => {
  it("every data-taking helper returns null on empty input", () => {
    expect(cagr([])).toBeNull();
    expect(yoy(null, null)).toBeNull();
    expect(grossMargin(null, null)).toBeNull();
    expect(avgEquity([])).toBeNull();
    expect(avgCapitalEmployed([])).toBeNull();
    expect(roe(null, null)).toBeNull();
    expect(roce(null, null)).toBeNull();
    expect(normalizeCapex(null)).toBeNull();
    expect(fcf(null, null)).toBeNull();
    expect(dso(null, null)).toBeNull();
    expect(dio(null, null)).toBeNull();
    expect(dpo(null, null)).toBeNull();
    expect(ccc(null, null, null)).toBeNull();
    expect(netDebt(null, null)).toBeNull();
    expect(netDebtToEbitda(null, null)).toBeNull();
    expect(debtToEquity(null, null)).toBeNull();
    expect(interestCoverage(null, null)).toBeNull();
    expect(cfoToPat(null, null)).toBeNull();
    expect(percentile([], 50)).toBeNull();
    expect(median([])).toBeNull();
    expect(minVal([])).toBeNull();
    expect(maxVal([])).toBeNull();
    expect(mean([])).toBeNull();
  });
});
