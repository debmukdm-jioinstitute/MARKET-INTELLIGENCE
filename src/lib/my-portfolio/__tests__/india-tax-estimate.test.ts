import { describe, expect, it } from "vitest";
import { estimateIndiaPortfolioTax } from "@/lib/my-portfolio/india-tax-estimate";
import type { PositionRow, TradeLogRow } from "@/lib/my-portfolio/types";

const pos = (over: Partial<PositionRow> & Pick<PositionRow, "symbol">): PositionRow => ({
  id: "1",
  market: "IN",
  name: "Test",
  sector: "IT",
  currency: "INR",
  shares: 10,
  avgCost: 100,
  last: 150,
  lastInr: 150,
  dayPct: 0.01,
  marketValueInr: 1500,
  weight: 1,
  pnlInr: 500,
  pnlPct: 0.5,
  ...over,
});

describe("estimateIndiaPortfolioTax", () => {
  it("applies STCG rate on short-term India gains", () => {
    const summary = estimateIndiaPortfolioTax({
      positions: [pos({ symbol: "TCS", pnlInr: 100_000 })],
      tradeLog: [],
      avgCostBySymbol: new Map([["TCS", 100]]),
      addedAtBySymbol: new Map([["TCS", new Date().toISOString().slice(0, 10)]]),
      fxRate: 87,
    });
    expect(summary.estimatedStcgTaxInr).toBeCloseTo(20_000);
  });

  it("counts realized sells toward STCG", () => {
    const trades: TradeLogRow[] = [{ symbol: "INFY", side: "SELL", shares: 5, price: 200, date: "2026-06-01" }];
    const summary = estimateIndiaPortfolioTax({
      positions: [],
      tradeLog: trades,
      avgCostBySymbol: new Map([["INFY", 100]]),
      addedAtBySymbol: new Map(),
      fxRate: 87,
    });
    expect(summary.totalRealizedGainInr).toBe(500);
    expect(summary.estimatedStcgTaxInr).toBeCloseTo(100);
  });
});
