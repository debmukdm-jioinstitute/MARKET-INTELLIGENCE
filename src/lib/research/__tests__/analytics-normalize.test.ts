/**
 * Tests for analytics-normalize.ts (Builder 3, `normalize`).
 *
 * Fixture: a minimal FinancialsPayload with 3 annual periods (columns
 * deliberately out of order), a few null cells, negative reported capex,
 * and NO COGS row — cogs must come from workingCapital.annuals.
 */
import { describe, expect, it } from "vitest";
import {
  detectCompanyType,
  normalizeFinancials,
} from "../analytics-normalize";
import type {
  FinancialsPayload,
  StatementColumn,
  StatementRow,
} from "../../financials/types";

const row = (
  tag: string,
  values: Record<string, number | null>,
  unit: "cr" | "ps" = "cr",
): StatementRow => ({ tag, label: tag, kind: "item", unit, values });

const col = (key: string, label: string, endDate: string): StatementColumn => ({
  key,
  label,
  startDate: "2024-04-01",
  endDate,
  periodKind: "annual",
  audited: true,
  basis: "consolidated",
  filingDate: `${endDate}`,
});

const fixture = (): FinancialsPayload => ({
  symbol: "TESTCO",
  companyName: "Test Company Ltd",
  layout: "general",
  asOf: "2026-10-09",
  quarters: [],
  // Deliberately out of order: normalizeFinancials must sort newest-last.
  annuals: [
    col("FY26", "FY26", "2026-03-31"),
    col("FY24", "FY24", "2024-03-31"),
    col("FY25", "FY25", "2025-03-31"),
  ],
  pl: {
    quarters: [],
    annuals: [
      row("RevenueFromOperations", { FY24: 1000, FY25: 1200, FY26: 1400 }),
      row("OtherIncome", { FY24: 50, FY25: 60, FY26: null }),
      row("ProfitBeforeTax", { FY24: 200, FY25: 240, FY26: 300 }),
      row("FinanceCosts", { FY24: 20, FY25: 24, FY26: 30 }),
      row("ProfitLossForPeriod", { FY24: 150, FY25: null, FY26: 220 }),
      row(
        "BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations",
        { FY24: 15, FY25: 18, FY26: 22 },
        "ps",
      ),
      // No COGS row anywhere in the fixture.
    ],
  },
  bs: {
    quarters: [],
    annuals: [
      row("Assets", { FY24: 2000, FY25: 2400, FY26: 2900 }),
      row("Equity", { FY24: 1200, FY25: 1450, FY26: 1750 }),
      row("CashAndCashEquivalents", { FY24: 100, FY25: 120, FY26: 150 }),
      row("CurrentAssets", { FY24: 800, FY25: 950, FY26: 1100 }),
      row("CurrentLiabilities", { FY24: 400, FY25: 480, FY26: 560 }),
      row("Inventories", { FY24: 200, FY25: 240, FY26: 280 }),
      row("TradeReceivablesCurrent", { FY24: 150, FY25: 180, FY26: 210 }),
      row("TradePayablesCurrent", { FY24: 120, FY25: 140, FY26: 160 }),
    ],
  },
  cf: {
    quarters: [],
    annuals: [
      row("CashFlowsFromUsedInOperatingActivities", {
        FY24: 180,
        FY25: 200,
        FY26: 250,
      }),
      // Provider reports capex as a NEGATIVE cash-flow number.
      row("PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", {
        FY24: -60,
        FY25: -80,
        FY26: -100,
      }),
    ],
  },
  workingCapital: {
    quarters: [],
    annuals: [
      {
        periodKey: "FY24",
        periodLabel: "FY24",
        revenue: 1000,
        cogs: 700,
        tradeReceivables: 150,
        inventories: 200,
        tradePayables: 120,
        workingCapital: 400,
        dso: null,
        dio: null,
        dpo: null,
        ccc: null,
      },
      {
        periodKey: "FY25",
        periodLabel: "FY25",
        revenue: 1200,
        cogs: 840,
        tradeReceivables: 180,
        inventories: 240,
        tradePayables: 140,
        workingCapital: 470,
        dso: null,
        dio: null,
        dpo: null,
        ccc: null,
      },
      {
        periodKey: "FY26",
        periodLabel: "FY26",
        revenue: 1400,
        cogs: 980,
        tradeReceivables: 210,
        inventories: 280,
        tradePayables: 160,
        workingCapital: 540,
        dso: null,
        dio: null,
        dpo: null,
        ccc: null,
      },
    ],
  },
  ratios: { quarters: [], annuals: [] },
  annualReports: [],
  forensicAnalysis: {
    healthScore: 0,
    rating: "Adequate",
    executiveSummary: "",
    aiModelUsed: "",
    flags: [],
    workingCapitalSummary: "",
    cashFlowQuality: "Moderate",
  },
  officialSources: [
    {
      name: "NSE",
      provider: "NSE",
      url: "https://www.nseindia.com",
      description: "Exchange filings",
    },
  ],
});

describe("normalizeFinancials", () => {
  const { periods, companyType } = normalizeFinancials(fixture());

  it("returns 3 periods, newest last", () => {
    expect(periods).toHaveLength(3);
    expect(periods.map((p) => p.label)).toEqual(["FY24", "FY25", "FY26"]);
    expect(periods.map((p) => p.key)).toEqual(["FY24", "FY25", "FY26"]);
    expect(periods.map((p) => p.endDate)).toEqual([
      "2024-03-31",
      "2025-03-31",
      "2026-03-31",
    ]);
  });

  it("maps P&L fields by exact tags", () => {
    expect(periods.map((p) => p.revenue)).toEqual([1000, 1200, 1400]);
    expect(periods.map((p) => p.pbt)).toEqual([200, 240, 300]);
    expect(periods.map((p) => p.interestExpense)).toEqual([20, 24, 30]);
    expect(periods.map((p) => p.eps)).toEqual([15, 18, 22]);
  });

  it("preserves null cells as null (never zeroed)", () => {
    expect(periods[1]?.pat).toBeNull(); // FY25 PAT null
    expect(periods[2]?.otherIncome).toBeNull(); // FY26 other income null
    expect(periods[0]?.pat).toBe(150);
  });

  it("derives ebit as pbt + interestExpense", () => {
    expect(periods.map((p) => p.ebit)).toEqual([220, 264, 330]);
  });

  it("normalizes negative reported capex to a positive outflow and computes FCF", () => {
    expect(periods.map((p) => p.capex)).toEqual([60, 80, 100]);
    // FCF = CFO - capex: 180-60, 200-80, 250-100
    expect(periods.map((p) => p.freeCashFlow)).toEqual([120, 120, 150]);
    expect(periods.map((p) => p.cfo)).toEqual([180, 200, 250]);
  });

  it("sources cogs from workingCapital.annuals when no XBRL tag exists", () => {
    expect(periods.map((p) => p.cogs)).toEqual([700, 840, 980]);
  });

  it("maps balance-sheet fields and leaves unmapped fields null", () => {
    expect(periods.map((p) => p.totalAssets)).toEqual([2000, 2400, 2900]);
    expect(periods.map((p) => p.totalEquity)).toEqual([1200, 1450, 1750]);
    expect(periods.map((p) => p.cash)).toEqual([100, 120, 150]);
    expect(periods.map((p) => p.inventory)).toEqual([200, 240, 280]);
    expect(periods.map((p) => p.receivables)).toEqual([150, 180, 210]);
    expect(periods.map((p) => p.payables)).toEqual([120, 140, 160]);
    for (const p of periods) {
      expect(p.grossProfit).toBeNull();
      expect(p.ebitda).toBeNull();
      expect(p.totalDebt).toBeNull();
      expect(p.sharesOutstanding).toBeNull();
    }
  });

  it("attaches honest per-period provenance", () => {
    for (const p of periods) {
      expect(p.source.provider).toBe("NSE");
      expect(p.source.sourceType).toBe("company_filing");
      expect(p.source.period).toBe(p.label);
      expect(p.source.sourceUrl).toBe("https://www.nseindia.com");
      expect(p.source.filingDate).toBe(p.endDate);
      expect(typeof p.source.retrievedAt).toBe("string");
      expect(Number.isNaN(Date.parse(p.source.retrievedAt ?? ""))).toBe(false);
    }
  });

  it("reports companyType unknown when the payload carries no industry field", () => {
    expect(companyType).toBe("unknown");
  });
});

describe("detectCompanyType", () => {
  it("classifies banks and NBFCs", () => {
    expect(detectCompanyType("Bank")).toBe("bank-nbfc");
    expect(detectCompanyType("Housing Finance")).toBe("bank-nbfc");
    expect(detectCompanyType("NBFC")).toBe("bank-nbfc");
    expect(detectCompanyType("Private Sector Bank")).toBe("bank-nbfc");
  });

  it("returns unknown for missing industry", () => {
    expect(detectCompanyType(null)).toBe("unknown");
    expect(detectCompanyType(undefined)).toBe("unknown");
    expect(detectCompanyType("")).toBe("unknown");
  });

  it("classifies everything else as industrial", () => {
    expect(detectCompanyType("Chemicals")).toBe("industrial");
    expect(detectCompanyType("IT Services")).toBe("industrial");
  });
});
