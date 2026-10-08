import { describe, expect, it } from "vitest";
import { deriveFinancialRatios, deriveWorkingCapital, formatPeriodLabel } from "../ratios";

describe("Financial Ratios & Working Capital Calculations", () => {
  it("formats Indian fiscal period labels correctly", () => {
    expect(formatPeriodLabel("2024-04-01", "2024-06-30", "quarter").label).toBe("Q1 FY25");
    expect(formatPeriodLabel("2024-07-01", "2024-09-30", "quarter").label).toBe("Q2 FY25");
    expect(formatPeriodLabel("2024-10-01", "2024-12-31", "quarter").label).toBe("Q3 FY25");
    expect(formatPeriodLabel("2025-01-01", "2025-03-31", "quarter").label).toBe("Q4 FY25");
    expect(formatPeriodLabel("2024-04-01", "2025-03-31", "annual").label).toBe("FY25");
  });

  it("calculates working capital cycle metrics accurately", () => {
    const pl = {
      RevenueFromOperations: 1000,
      CostOfMaterialsConsumed: 400,
      Expenses: 800,
    };
    const bs = {
      TradeReceivablesCurrent: 200, // DSO: (200 / 1000) * 365 = 73 days
      Inventories: 100,             // DIO: (100 / 400) * 365 = 91.25 days
      TradePayablesCurrent: 80,     // DPO: (80 / 400) * 365 = 73 days
      CurrentAssets: 500,
      CurrentLiabilities: 250,
    };

    const wc = deriveWorkingCapital("2025-03-31", "FY25", pl, bs, "annual");
    expect(wc.revenue).toBe(1000);
    expect(wc.cogs).toBe(400);
    expect(wc.workingCapital).toBe(250);
    expect(wc.dso).toBe(73);
    expect(wc.dio).toBe(91.25);
    expect(wc.dpo).toBe(73);
    // CCC = 73 + 91.25 - 73 = 91.25
    expect(wc.ccc).toBe(91.25);
  });

  it("calculates solvency, leverage, margin and return ratios accurately", () => {
    const pl = {
      RevenueFromOperations: 1000,
      Expenses: 750,
      FinanceCosts: 25,
      ProfitBeforeTax: 200,
      ProfitLossForPeriod: 150,
    };
    const bs = {
      Assets: 1200,
      Equity: 600,
      BorrowingsNoncurrent: 200,
      BorrowingsCurrent: 100,
      CurrentAssets: 400,
      CurrentLiabilities: 200,
    };
    const cf = {
      CashFlowsFromUsedInOperatingActivities: 180,
    };

    const r = deriveFinancialRatios("2025-03-31", "FY25", pl, bs, cf, "annual");
    // OPM is EBITDA-style (PBDIT convention): 1000 - (750 - 25) = 275 -> 27.5%
    // (M1: the label on the page is "EBITDA margin", not "Operating margin".)
    expect(r.opmPct).toBe(27.5);
    expect(r.npmPct).toBe(15);       // 150 / 1000 * 100
    expect(r.currentRatio).toBe(2);   // 400 / 200
    expect(r.debtToEquity).toBe(0.5); // (200 + 100) / 600
    expect(r.interestCoverage).toBe(9); // (200 + 25) / 25
    expect(r.cfoToNetProfit).toBe(1.2); // 180 / 150
    expect(r.roePct).toBe(25);        // 150 / 600 * 100
    expect(r.rocePct).toBe(22.5);    // (200 + 25) / (1200 - 200) * 100 — pre-tax ROCE on capital employed
  });

  it("reports 0.00x debt-to-equity for zero-debt companies (L1)", () => {
    const pl = {
      RevenueFromOperations: 1000,
      Expenses: 750,
      FinanceCosts: 0,
      ProfitBeforeTax: 200,
      ProfitLossForPeriod: 150,
    };
    const bs = {
      Assets: 1200,
      Equity: 600,
      BorrowingsNoncurrent: 0,
      BorrowingsCurrent: 0,
      CurrentAssets: 400,
      CurrentLiabilities: 200,
    };
    const r = deriveFinancialRatios("2025-03-31", "FY25", pl, bs, null, "annual");
    // 0 + 0 is falsy under `||` but genuinely zero debt — must be 0, not null.
    expect(r.debtToEquity).toBe(0);
  });

  it("annualizes quarterly return ratios ×4 (disclosed as annualized on the page, M5)", () => {
    const pl = { RevenueFromOperations: 250, ProfitLossForPeriod: 37.5 };
    const bs = { Equity: 600, Assets: 1200, CurrentLiabilities: 200 };
    const r = deriveFinancialRatios("2026-06-30", "Q1 FY27", pl, bs, null, "quarter");
    // 37.5 × 4 / 600 × 100 = 25% — the UI must label this "(annualized)".
    expect(r.roePct).toBe(25);
    const a = deriveFinancialRatios("2025-03-31", "FY25", { ...pl, ProfitLossForPeriod: 150 }, bs, null, "annual");
    expect(a.roePct).toBe(25);
  });

  it("falls back to the Borrowings total when split borrowings are absent", () => {
    const pl = { RevenueFromOperations: 1000, ProfitLossForPeriod: 100 };
    const bs = { Equity: 500, Borrowings: 250 };
    const r = deriveFinancialRatios("2025-03-31", "FY25", pl, bs, null, "annual");
    expect(r.debtToEquity).toBe(0.5);
  });
});
