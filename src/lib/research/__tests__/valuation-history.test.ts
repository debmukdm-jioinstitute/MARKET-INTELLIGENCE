/**
 * Tests for the Historical Valuation Bands engine (spec FEATURE 4, 4A-4I).
 * Focus: no look-ahead bias, negative-earnings safety, insufficient history,
 * bank/NBFC suppression, price selection, and percentile math.
 */
import { describe, expect, it } from "vitest";
import {
  buildValuationHistory,
  type ValuationMultiple,
} from "../valuation-history";
import type { NormalizedPeriod } from "../analytics-types";

const TEST_SOURCE = {
  provider: "test",
  sourceType: "company_filing" as const,
  retrievedAt: "2026-10-09T00:00:00.000Z",
};

function period(overrides: Partial<NormalizedPeriod>): NormalizedPeriod {
  return {
    key: "FY25",
    label: "FY25",
    endDate: "2025-03-31",
    revenue: 1000,
    grossProfit: null,
    ebitda: 200,
    ebit: null,
    pbt: null,
    pat: 150,
    eps: 10,
    cfo: null,
    capex: null,
    freeCashFlow: 100,
    totalAssets: null,
    totalEquity: 2000,
    totalDebt: 500,
    cash: 100,
    currentAssets: null,
    currentLiabilities: null,
    inventory: null,
    receivables: null,
    payables: null,
    interestExpense: null,
    sharesOutstanding: 100,
    otherIncome: null,
    cogs: null,
    source: TEST_SOURCE,
    ...overrides,
  };
}

function byId(
  multiples: ValuationMultiple[],
  id: ValuationMultiple["id"],
): ValuationMultiple {
  const m = multiples.find((x) => x.id === id);
  if (!m) throw new Error(`multiple ${id} missing`);
  return m;
}

describe("buildValuationHistory", () => {
  it("(a) look-ahead trap: later restated revenue never leaks into an earlier observation", () => {
    // Period 3 "restates" revenue sharply upward; period 2's observation must
    // still use period 2's own reported revenue (2000), not period 3's (5000).
    const periods = [
      period({ key: "FY23", label: "FY23", endDate: "2023-03-31" }),
      period({
        key: "FY24",
        label: "FY24",
        endDate: "2024-03-31",
        revenue: 2000,
      }),
      period({
        key: "FY25",
        label: "FY25",
        endDate: "2025-03-31",
        revenue: 5000, // restated upward in a later filing
      }),
    ];
    const candles = [
      { date: "2023-03-31", close: 50 },
      { date: "2024-03-31", close: 60 },
      { date: "2025-03-31", close: 70 },
    ];
    const h = buildValuationHistory(periods, candles, "industrial");
    const evSales = byId(h.multiples, "ev-sales");
    // Observation 2: EV = 60*100 + 500 - 100 = 6400; revenue = 2000 -> 3.2.
    expect(evSales.points[1]?.date).toBe("2024-03-31");
    expect(evSales.points[1]?.evSales).toBeCloseTo(6400 / 2000, 10);
    // Observation 3 uses its own revenue: EV = 70*100+500-100=7400 -> 1.48.
    expect(evSales.points[2]?.evSales).toBeCloseTo(7400 / 5000, 10);
  });

  it("(b) negative-eps year: P/E null (never negative), P/B still present", () => {
    const periods = [
      period({ key: "FY24", label: "FY24", endDate: "2024-03-31", eps: -5 }),
      period({ key: "FY25", label: "FY25", endDate: "2025-03-31", eps: 10 }),
    ];
    const candles = [
      { date: "2024-03-31", close: 60 },
      { date: "2025-03-31", close: 60 },
    ];
    const h = buildValuationHistory(periods, candles, "industrial");
    const pe = byId(h.multiples, "pe");
    // Loss year: no fabricated negative P/E; profit year unaffected.
    expect(pe.points[0]?.pe).toBeNull();
    expect(pe.points[1]?.pe).toBeCloseTo(60 / 10, 10);
    const pb = byId(h.multiples, "pb");
    // marketCap 6000 / equity 2000 = 3, present in both years
    expect(pb.points[0]?.pb).toBeCloseTo(3, 10);
    expect(pb.points[1]?.pb).toBeCloseTo(3, 10);
    expect(h.notes).toContain(
      "P/E omitted for periods with non-positive earnings.",
    );
  });

  it("(c) fewer than 8 observations: insufficient:true and null stats", () => {
    const periods = Array.from({ length: 7 }, (_, i) =>
      period({
        key: `FY${19 + i}`,
        label: `FY${19 + i}`,
        endDate: `${2019 + i}-03-31`,
      }),
    );
    const candles = periods.map((p) => ({ date: p.endDate, close: 50 }));
    const h = buildValuationHistory(periods, candles, "industrial");
    // Window membership filters by date: 1Y->2, 3Y->4, 5Y->6, 10Y->7 points.
    const expectedCounts = { "1Y": 2, "3Y": 4, "5Y": 6, "10Y": 7 } as const;
    for (const m of h.multiples) {
      for (const window of ["1Y", "3Y", "5Y", "10Y"] as const) {
        const s = m.stats[window];
        expect(s.insufficient).toBe(true);
        expect(s.count).toBe(expectedCounts[window]);
        expect(s.current).toBeNull();
        expect(s.median).toBeNull();
        expect(s.p25).toBeNull();
        expect(s.p75).toBeNull();
        expect(s.min).toBeNull();
        expect(s.max).toBeNull();
        expect(s.percentile).toBeNull();
      }
    }
  });

  it("(d) bank-nbfc: EV/EBITDA multiple omitted entirely, EV/Sales kept", () => {
    const periods = [
      period({ key: "FY25", label: "FY25", endDate: "2025-03-31" }),
    ];
    const candles = [{ date: "2025-03-31", close: 60 }];
    const h = buildValuationHistory(periods, candles, "bank-nbfc");
    const ids = h.multiples.map((m) => m.id);
    expect(ids).not.toContain("ev-ebitda");
    expect(ids).toContain("ev-sales");
    expect(ids).toContain("pe");
    expect(ids).toContain("pb");
    expect(ids).toContain("fcf-yield");
    expect(h.notes).toContain(
      "EV/EBITDA is not applicable to banks/NBFCs and was omitted.",
    );
  });

  it("(e) price is the latest candle on or before the observation date; later candles ignored", () => {
    const periods = [
      period({ key: "FY24", label: "FY24", endDate: "2024-03-31", eps: 10 }),
    ];
    const candles = [
      { date: "2024-03-28", close: 90 },
      { date: "2024-03-31", close: 100 },
      { date: "2024-04-05", close: 200 }, // after obs date: must be ignored
    ];
    const h = buildValuationHistory(periods, candles, "industrial");
    const pe = byId(h.multiples, "pe");
    // 100 / 10 = 10, not 200/10 = 20
    expect(pe.points[0]?.pe).toBeCloseTo(10, 10);
    // marketCap 100*100=10000 / equity 2000 = 5
    const pb = byId(h.multiples, "pb");
    expect(pb.points[0]?.pb).toBeCloseTo(5, 10);
  });

  it("(f) percentile math on a hand-computed 8-observation set", () => {
    // 8 annual periods, eps=1, so P/E equals the candle close exactly.
    // Values (ascending by date): 10,20,30,40,50,60,70,45 -> current = 45.
    const closes = [10, 20, 30, 40, 50, 60, 70, 45];
    const periods = closes.map((_, i) =>
      period({
        key: `FY${18 + i}`,
        label: `FY${18 + i}`,
        endDate: `${2018 + i}-03-31`,
        eps: 1,
        sharesOutstanding: 100,
      }),
    );
    const candles = periods.map((p, i) => ({
      date: p.endDate,
      close: closes[i],
    }));
    const h = buildValuationHistory(periods, candles, "industrial");
    const pe = byId(h.multiples, "pe");
    const s = pe.stats["10Y"];
    expect(s.insufficient).toBe(false);
    expect(s.count).toBe(8);
    expect(s.current).toBe(45);
    // Sorted values: 10,20,30,40,45,50,60,70.
    // p25: i = 0.25*7 = 1.75 -> 20 + 10*0.75 = 27.5
    expect(s.p25).toBeCloseTo(27.5, 10);
    // median: i = 3.5 -> 40 + (45-40)*0.5 = 42.5
    expect(s.median).toBeCloseTo(42.5, 10);
    // p75: i = 5.25 -> 50 + (60-50)*0.25 = 52.5
    expect(s.p75).toBeCloseTo(52.5, 10);
    expect(s.min).toBe(10);
    expect(s.max).toBe(70);
    // Values <= 45: 10,20,30,40,45 -> 5/8 = 62.5
    expect(s.percentile).toBeCloseTo(62.5, 10);
  });

  it("omits a multiple with zero valid points and skips observations with no price", () => {
    // No candle on or before the first period end -> that observation skipped.
    const periods = [
      period({ key: "FY23", label: "FY23", endDate: "2023-03-31" }),
      period({ key: "FY24", label: "FY24", endDate: "2024-03-31", ebitda: null }),
    ];
    const candles = [
      { date: "2023-04-01", close: 40 }, // after FY23 end: must not be used
      { date: "2024-03-31", close: 50 },
    ];
    const h = buildValuationHistory(periods, candles, "industrial");
    // FY24: ebitda null -> evEbitda null, but pe/pb/evSales/fcfYield exist.
    const ids = h.multiples.map((m) => m.id);
    expect(ids).not.toContain("ev-ebitda"); // zero valid points overall
    expect(ids).toContain("pe");
    expect(h.asOf).toBe("2024-03-31");
    expect(
      h.notes.some((n) => n.includes("skipped: no market price available")),
    ).toBe(true);
  });

  it("notes describe methodology and asOf equals the latest observation date", () => {
    const periods = [
      period({ key: "FY24", label: "FY24", endDate: "2024-03-31" }),
      period({ key: "FY25", label: "FY25", endDate: "2025-03-31" }),
    ];
    const candles = [
      { date: "2024-03-31", close: 60 },
      { date: "2025-03-31", close: 70 },
    ];
    const h = buildValuationHistory(periods, candles, "industrial");
    expect(h.asOf).toBe("2025-03-31");
    expect(h.notes[0]).toBe(
      "Based on reported fundamentals available at each observation date.",
    );
    expect(h.source.provider).toBe("Yahoo Finance");
    expect(h.source.sourceType).toBe("market_data");
    expect(h.source.inputs).toContain("company_filing");
  });
});
