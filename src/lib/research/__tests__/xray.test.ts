/**
 * Tests for the Financial X-Ray engine (src/lib/research/xray.ts).
 *
 * Fixture: 6 annual periods (FY21-FY26, newest last) for an industrial
 * company with steadily growing financials. Values are in INR crores.
 */
import { describe, expect, it } from "vitest";
import type {
  MetricSource,
  NormalizedPeriod,
} from "../analytics-types";
import { buildXRay } from "../xray";

const filingSrc: MetricSource = {
  provider: "NSE",
  sourceType: "company_filing",
  retrievedAt: "2026-10-09T00:00:00.000Z",
};

function period(
  key: string,
  label: string,
  vals: Partial<NormalizedPeriod>,
): NormalizedPeriod {
  return {
    key,
    label,
    endDate: `20${label.slice(2)}-03-31`,
    revenue: null,
    grossProfit: null,
    ebitda: null,
    ebit: null,
    pbt: null,
    pat: null,
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
    source: filingSrc,
    ...vals,
  };
}

/** 6 annual periods, newest last, industrial company. */
function industrialFixture(): NormalizedPeriod[] {
  const years = [
    {
      revenue: 100, grossProfit: 40, ebitda: 15, ebit: 10, pat: 6, eps: 6,
      cfo: 12, capex: 5, totalAssets: 120, totalEquity: 50, totalDebt: 20,
      cash: 5, currentAssets: 30, currentLiabilities: 18, inventory: 10,
      receivables: 12, payables: 8, interestExpense: 2, cogs: 60,
    },
    {
      revenue: 120, grossProfit: 48, ebitda: 19, ebit: 13, pat: 8, eps: 8,
      cfo: 14, capex: 6, totalAssets: 140, totalEquity: 58, totalDebt: 22,
      cash: 6, currentAssets: 34, currentLiabilities: 20, inventory: 12,
      receivables: 14, payables: 9, interestExpense: 2.2, cogs: 72,
    },
    {
      revenue: 145, grossProfit: 58, ebitda: 24, ebit: 17, pat: 11, eps: 11,
      cfo: 18, capex: 8, totalAssets: 165, totalEquity: 68, totalDebt: 25,
      cash: 8, currentAssets: 40, currentLiabilities: 23, inventory: 14,
      receivables: 17, payables: 11, interestExpense: 2.5, cogs: 87,
    },
    {
      revenue: 165, grossProfit: 66, ebitda: 26, ebit: 18, pat: 12, eps: 12,
      cfo: 20, capex: 7, totalAssets: 185, totalEquity: 79, totalDebt: 24,
      cash: 9, currentAssets: 44, currentLiabilities: 25, inventory: 15,
      receivables: 19, payables: 12, interestExpense: 2.4, cogs: 99,
    },
    {
      revenue: 190, grossProfit: 76, ebitda: 30, ebit: 21, pat: 14, eps: 14,
      cfo: 24, capex: 9, totalAssets: 210, totalEquity: 92, totalDebt: 26,
      cash: 10, currentAssets: 50, currentLiabilities: 28, inventory: 17,
      receivables: 22, payables: 14, interestExpense: 2.6, cogs: 114,
    },
    {
      revenue: 220, grossProfit: 88, ebitda: 36, ebit: 26, pat: 18, eps: 18,
      cfo: 30, capex: 10, totalAssets: 240, totalEquity: 108, totalDebt: 28,
      cash: 12, currentAssets: 58, currentLiabilities: 32, inventory: 20,
      receivables: 26, payables: 16, interestExpense: 2.8, cogs: 132,
    },
  ];
  return years.map((vals, i) =>
    period(`FY${21 + i}`, `FY${21 + i}`, vals),
  );
}

const rowById = (rows: { id: string }[], id: string) =>
  rows.find((r) => r.id === id) as {
    id: string;
    label: string;
    latest: { value: number | null; state: string; note: string | null };
    byPeriod: Record<string, { value: number | null; state: string }>;
  };

describe("buildXRay metadata", () => {
  it("passes through periods, sets asOf and derived source", () => {
    const x = buildXRay(industrialFixture(), "industrial");
    expect(x.periods.map((p) => p.key)).toEqual([
      "FY21", "FY22", "FY23", "FY24", "FY25", "FY26",
    ]);
    expect(x.asOf).toBe("FY26");
    expect(x.source.provider).toBe("NSE");
    expect(x.source.sourceType).toBe("derived");
    expect(x.source.inputs).toEqual(["company_filing"]);
    expect(typeof x.source.retrievedAt).toBe("string");
  });

  it("produces the full row/trend shape", () => {
    const x = buildXRay(industrialFixture(), "industrial");
    expect(x.growth.map((r) => r.id)).toEqual([
      "revenue-cagr", "ebitda-cagr", "pat-cagr", "eps-cagr", "cfo-cagr",
    ]);
    expect(x.profitability.map((r) => r.id)).toEqual([
      "gross-margin", "ebitda-margin", "ebit-margin", "pat-margin", "roe", "roce",
    ]);
    expect(x.health.map((r) => r.id)).toEqual([
      "net-debt", "net-debt-ebitda", "debt-equity", "interest-coverage", "current-ratio",
    ]);
    expect(x.cashQuality.map((r) => r.id)).toEqual([
      "cfo-pat", "fcf", "fcf-margin", "fcf-conversion", "capex-revenue",
    ]);
    expect(x.efficiency.map((r) => r.id)).toEqual([
      "receivable-days", "inventory-days", "payable-days", "ccc", "asset-turnover",
    ]);
    expect(x.trends.map((t) => t.id)).toEqual([
      "trend-revenue", "trend-ebitda", "trend-pat", "trend-cfo", "trend-fcf",
      "trend-ebitda-margin", "trend-roe", "trend-roce", "trend-net-debt",
    ]);
  });
});

describe("growth CAGRs", () => {
  it("computes 5Y CAGR as latest with percent values", () => {
    const x = buildXRay(industrialFixture(), "industrial");
    const rev = rowById(x.growth, "revenue-cagr");
    expect(rev.latest.state).toBe("ok");
    // (220/100)^(1/5) - 1 = 17.07%
    expect(rev.latest.value).toBeCloseTo(17.07, 1);
    expect(rev.latest.note).toContain("5 reported years");
    expect(rowById(x.growth, "ebitda-cagr").latest.value).toBeCloseTo(19.13, 1);
    expect(rowById(x.growth, "pat-cagr").latest.value).toBeCloseTo(24.57, 1);
    expect(rowById(x.growth, "eps-cagr").latest.value).toBeCloseTo(24.57, 1);
    expect(rowById(x.growth, "cfo-cagr").latest.value).toBeCloseTo(20.11, 1);
  });

  it("provides per-period YoY context in byPeriod", () => {
    const x = buildXRay(industrialFixture(), "industrial");
    const rev = rowById(x.growth, "revenue-cagr");
    expect(Object.keys(rev.byPeriod)).toEqual([
      "FY21", "FY22", "FY23", "FY24", "FY25", "FY26",
    ]);
    expect(rev.byPeriod.FY21.state).toBe("unavailable");
    expect(rev.byPeriod.FY22.value).toBeCloseTo(20, 5);
    expect(rev.byPeriod.FY26.value).toBeCloseTo((220 - 190) / 190 * 100, 5);
  });

  it("falls back to 3Y CAGR when only 4 periods exist", () => {
    const x = buildXRay(industrialFixture().slice(0, 4), "industrial");
    const rev = rowById(x.growth, "revenue-cagr");
    expect(rev.latest.state).toBe("ok");
    // (165/100)^(1/3) - 1 = 18.16%
    expect(rev.latest.value).toBeCloseTo(18.16, 1);
    expect(rev.latest.note).toContain("3 reported years");
  });

  it("reports insufficient-history with 2 periods", () => {
    const x = buildXRay(industrialFixture().slice(0, 2), "industrial");
    for (const id of [
      "revenue-cagr", "ebitda-cagr", "pat-cagr", "eps-cagr", "cfo-cagr",
    ]) {
      const row = rowById(x.growth, id);
      expect(row.latest.state).toBe("insufficient-history");
      expect(row.latest.note).toContain("Insufficient history");
    }
  });

  it("reports not meaningful when the base value is non-positive", () => {
    const periods = industrialFixture()
      .slice(0, 4)
      .map((p, i) => period(p.key, p.label, { ...p, pat: [-5, 3, 6, 9][i] ?? null }));
    const x = buildXRay(periods, "industrial");
    const pat = rowById(x.growth, "pat-cagr");
    expect(pat.latest.state).toBe("insufficient-history");
    expect(pat.latest.note).toContain("non-positive base");
  });
});

describe("profitability", () => {
  it("computes latest margins and roe/roce on averaged bases", () => {
    const x = buildXRay(industrialFixture(), "industrial");
    expect(rowById(x.profitability, "gross-margin").latest.value).toBeCloseTo(40, 5);
    expect(rowById(x.profitability, "ebitda-margin").latest.value).toBeCloseTo(16.36, 1);
    expect(rowById(x.profitability, "ebit-margin").latest.value).toBeCloseTo(11.82, 1);
    expect(rowById(x.profitability, "pat-margin").latest.value).toBeCloseTo(8.18, 1);
    // ROE = 18 / avg(50,58,68,79,92,108) * 100 = 23.74
    expect(rowById(x.profitability, "roe").latest.value).toBeCloseTo(23.74, 1);
    // ROCE = 26 / avg(equity+debt = 600/6 = 100) * 100 = 26.0
    expect(rowById(x.profitability, "roce").latest.value).toBeCloseTo(26.0, 1);
    expect(Object.keys(rowById(x.profitability, "roe").byPeriod)).toHaveLength(6);
  });
});

describe("balance-sheet health", () => {
  it("computes leverage and coverage metrics", () => {
    const x = buildXRay(industrialFixture(), "industrial");
    expect(rowById(x.health, "net-debt").latest.value).toBe(16);
    expect(rowById(x.health, "net-debt-ebitda").latest.value).toBeCloseTo(0.4444, 3);
    expect(rowById(x.health, "debt-equity").latest.value).toBeCloseTo(0.2593, 3);
    expect(rowById(x.health, "interest-coverage").latest.value).toBeCloseTo(9.2857, 3);
    expect(rowById(x.health, "current-ratio").latest.value).toBeCloseTo(1.8125, 3);
  });

  it("marks leverage rows not-applicable for bank-nbfc", () => {
    const x = buildXRay(industrialFixture(), "bank-nbfc");
    for (const id of ["net-debt-ebitda", "debt-equity"]) {
      const row = rowById(x.health, id);
      expect(row.latest.state).toBe("not-applicable");
      expect(row.latest.note).toContain("banks/NBFCs");
    }
    // other health rows still compute
    expect(rowById(x.health, "net-debt").latest.state).toBe("ok");
    expect(rowById(x.health, "interest-coverage").latest.state).toBe("ok");
  });

  it("treats unknown company type as industrial", () => {
    const x = buildXRay(industrialFixture(), "unknown");
    expect(rowById(x.health, "debt-equity").latest.state).toBe("ok");
    expect(rowById(x.efficiency, "ccc").latest.state).toBe("ok");
  });
});

describe("cash quality", () => {
  it("computes fcf from cfo minus normalized capex and derived ratios", () => {
    const x = buildXRay(industrialFixture(), "industrial");
    expect(rowById(x.cashQuality, "fcf").latest.value).toBe(20);
    expect(rowById(x.cashQuality, "fcf-margin").latest.value).toBeCloseTo(9.09, 1);
    expect(rowById(x.cashQuality, "fcf-conversion").latest.value).toBeCloseTo(0.5556, 3);
    expect(rowById(x.cashQuality, "cfo-pat").latest.value).toBeCloseTo(1.6667, 3);
    expect(rowById(x.cashQuality, "capex-revenue").latest.value).toBeCloseTo(4.5455, 3);
  });
});

describe("operating efficiency", () => {
  it("computes working-capital days from reliable cogs", () => {
    const x = buildXRay(industrialFixture(), "industrial");
    expect(rowById(x.efficiency, "receivable-days").latest.value).toBeCloseTo(43.14, 1);
    expect(rowById(x.efficiency, "inventory-days").latest.value).toBeCloseTo(55.3, 1);
    expect(rowById(x.efficiency, "payable-days").latest.value).toBeCloseTo(44.24, 1);
    expect(rowById(x.efficiency, "ccc").latest.value).toBeCloseTo(54.2, 1);
    // asset turnover = 220 / avg(120,140,165,185,210,240)
    expect(rowById(x.efficiency, "asset-turnover").latest.value).toBeCloseTo(1.2453, 3);
  });

  it("suppresses cogs-dependent rows when cogs is missing", () => {
    const periods = industrialFixture().map((p) =>
      period(p.key, p.label, { ...p, cogs: null }),
    );
    const x = buildXRay(periods, "industrial");
    for (const id of ["inventory-days", "payable-days", "ccc"]) {
      const row = rowById(x.efficiency, id);
      expect(row.latest.state).toBe("not-applicable");
      expect(row.latest.note).toContain("COGS");
    }
    // receivable days does not need cogs
    expect(rowById(x.efficiency, "receivable-days").latest.state).toBe("ok");
  });

  it("marks inventory-days and ccc not-applicable for bank-nbfc", () => {
    const x = buildXRay(industrialFixture(), "bank-nbfc");
    for (const id of ["inventory-days", "ccc"]) {
      const row = rowById(x.efficiency, id);
      expect(row.latest.state).toBe("not-applicable");
      expect(row.latest.note).toContain("banks/NBFCs");
    }
    expect(rowById(x.efficiency, "receivable-days").latest.state).toBe("ok");
  });
});

describe("trends", () => {
  it("emits annual points newest last with nulls for missing values", () => {
    const periods = industrialFixture();
    // drop CFO for FY23 to check null propagation
    periods[2] = period(periods[2].key, periods[2].label, { ...periods[2], cfo: null });
    const x = buildXRay(periods, "industrial");
    const rev = x.trends.find((t) => t.id === "trend-revenue");
    expect(rev).toBeDefined();
    expect(rev?.points).toHaveLength(6);
    expect(rev?.points[0]).toEqual({ periodKey: "FY21", value: 100 });
    expect(rev?.points[5]).toEqual({ periodKey: "FY26", value: 220 });
    const cfo = x.trends.find((t) => t.id === "trend-cfo");
    expect(cfo?.points[2]).toEqual({ periodKey: "FY23", value: null });
    const margin = x.trends.find((t) => t.id === "trend-ebitda-margin");
    expect(margin?.unit).toBe("pct");
    expect(margin?.points[5].value).toBeCloseTo(16.36, 1);
    const roe = x.trends.find((t) => t.id === "trend-roe");
    expect(roe?.points[5].value).toBeCloseTo(23.74, 1);
  });
});
