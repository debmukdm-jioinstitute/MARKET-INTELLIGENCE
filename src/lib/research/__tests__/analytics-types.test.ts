import { describe, expect, it } from "vitest";
import {
  insufficientHistory,
  metric,
  notApplicable,
  unavailable,
} from "../analytics-types";
import type {
  Metric,
  MetricSource,
  NormalizedPeriod,
} from "../analytics-types";

const source: MetricSource = {
  provider: "NSE corporate filings",
  sourceType: "company_filing",
  sourceUrl: "https://example.com/filing",
  filingDate: "2026-05-30",
  period: "FY26",
  retrievedAt: "2026-10-09T02:00:00Z",
  inputs: ["FY26 PAT", "FY26 net worth"],
};

describe("metric()", () => {
  it("returns state ok for a finite value", () => {
    const m = metric(18.7, "pct", source);
    expect(m).toEqual({
      value: 18.7,
      unit: "pct",
      state: "ok",
      note: null,
      source,
    });
  });

  it("accepts 0 and negative finite values as ok", () => {
    expect(metric(0, "inr-cr", source).state).toBe("ok");
    expect(metric(-4.2, "pct", source).state).toBe("ok");
  });

  it("returns unavailable for null", () => {
    const m = metric(null, "pct", source);
    expect(m.state).toBe("unavailable");
    expect(m.value).toBeNull();
  });

  it("returns unavailable for NaN", () => {
    expect(metric(Number.NaN, "multiple", source).state).toBe("unavailable");
  });

  it("returns unavailable for Infinity and -Infinity", () => {
    expect(metric(Number.POSITIVE_INFINITY, "ratio", source).state).toBe(
      "unavailable",
    );
    expect(metric(Number.NEGATIVE_INFINITY, "ratio", source).state).toBe(
      "unavailable",
    );
  });

  it("defaults note to null", () => {
    expect(metric(1, "pct", source).note).toBeNull();
  });

  it("passes an explicit note through", () => {
    expect(metric(1, "pct", source, "estimated").note).toBe("estimated");
  });

  it("supports null unit", () => {
    const m: Metric = metric(null, null, source, "no data");
    expect(m.unit).toBeNull();
    expect(m.state).toBe("unavailable");
  });
});

describe("unavailable()", () => {
  it("produces the unavailable state with null value and unit", () => {
    const m = unavailable(source);
    expect(m.state).toBe("unavailable");
    expect(m.value).toBeNull();
    expect(m.unit).toBeNull();
    expect(m.note).toBeNull();
    expect(m.source).toBe(source);
  });

  it("keeps an explicit note", () => {
    expect(unavailable(source, "not reported").note).toBe("not reported");
  });
});

describe("notApplicable()", () => {
  it("produces the not-applicable state with null value and unit", () => {
    const m = notApplicable(source, "banks carry no inventory");
    expect(m.state).toBe("not-applicable");
    expect(m.value).toBeNull();
    expect(m.unit).toBeNull();
    expect(m.note).toBe("banks carry no inventory");
    expect(m.source).toBe(source);
  });
});

describe("insufficientHistory()", () => {
  it("produces the insufficient-history state with null value and unit", () => {
    const m = insufficientHistory(source, "only 2 reported years; CAGR needs 3+");
    expect(m.state).toBe("insufficient-history");
    expect(m.value).toBeNull();
    expect(m.unit).toBeNull();
    expect(m.note).toBe("only 2 reported years; CAGR needs 3+");
    expect(m.source).toBe(source);
  });
});

describe("NormalizedPeriod", () => {
  it("typechecks with every field populated", () => {
    const period: NormalizedPeriod = {
      key: "FY26",
      label: "FY2025-26",
      endDate: "2026-03-31",
      filingDate: "2026-05-30",
      revenue: 10000,
      grossProfit: 4000,
      ebitda: 2500,
      ebit: 2000,
      pbt: 1800,
      pat: 1300,
      eps: 65,
      cfo: 1500,
      capex: 600,
      freeCashFlow: 900,
      totalAssets: 12000,
      totalEquity: 7000,
      totalDebt: 3000,
      cash: 800,
      currentAssets: 5000,
      currentLiabilities: 3200,
      inventory: 900,
      receivables: 1100,
      payables: 700,
      interestExpense: 200,
      sharesOutstanding: 20,
      otherIncome: 150,
      cogs: 6000,
      source,
    };
    expect(period.revenue).toBe(10000);
    expect(period.filingDate).toBe("2026-05-30");
    expect(period.source).toBe(source);
  });

  it("typechecks with nulls and no filingDate", () => {
    const period: NormalizedPeriod = {
      key: "Q1FY27",
      label: "Q1 FY2026-27",
      endDate: "2026-06-30",
      revenue: 2600,
      grossProfit: null,
      ebitda: null,
      ebit: null,
      pbt: null,
      pat: 340,
      eps: null,
      cfo: null,
      capex: null,
      freeCashFlow: null,
      totalAssets: null,
      totalEquity: null,
      totalDebt: null,
      cash: null,
      currentAssets: null,
      currentLiabilities: null,
      inventory: null,
      receivables: null,
      payables: null,
      interestExpense: null,
      sharesOutstanding: null,
      otherIncome: null,
      cogs: null,
      source,
    };
    expect(period.filingDate).toBeUndefined();
    expect(period.pat).toBe(340);
  });
});
