import { describe, it, expect } from "vitest";
import {
  calculateFundOverlap,
  computeInstitutionalAccumulation,
  filterAccumulationRadar,
  getInstitutionalSectorFlows,
} from "../analytics";
import type { MutualFund, FundHolding } from "../types";

// ---------------------------------------------------------------------------
// TEST FIXTURES — synthetic data for unit-testing the analytics math ONLY.
// These are not real fund portfolios and must never be shown to users.
// ---------------------------------------------------------------------------

function holding(partial: Partial<FundHolding> & { symbol: string }): FundHolding {
  return {
    name: `${partial.symbol} Ltd`,
    isin: `INE000${partial.symbol}`,
    sector: "Financial Services",
    weightPct: 5,
    shares: 1_000_000,
    marketValueCr: 100,
    marketCapCategory: "Large Cap",
    changeStatus: "UNCHANGED",
    sharesChangePct: 0,
    ...partial,
  };
}

function fixtureFund(id: string, holdings: FundHolding[]): MutualFund {
  return {
    id,
    amfiCode: `TEST-${id}`,
    name: `Test Fixture Fund ${id}`,
    shortName: `Fixture ${id}`,
    amc: "Test AMC",
    category: "Flexi Cap",
    benchmark: "NIFTY 500 TRI",
    aumCr: 1000,
    nav: 100,
    navDate: "2026-01-01",
    expenseRatioPct: 1,
    riskRating: "Very High",
    inceptionDate: "2020-01-01",
    holdings,
    sectorExposure: [],
    factorExposure: [],
    concentration: {
      top5WeightPct: 25,
      top10WeightPct: 50,
      totalHoldingsCount: holdings.length,
      hhi: 300,
      effectiveNumStocks: 33.3,
      marketCapBreakdown: { largeCapPct: 80, midCapPct: 10, smallCapPct: 5, cashPct: 5 },
    },
    changesMoM: {
      month: "Test Month",
      newEntries: [],
      completeExits: [],
      accumulated: [],
      trimmed: [],
    },
    managerBehaviour: {
      managerName: "Test Manager",
      managerTenureYears: 5,
      turnoverRatioPct: 20,
      activeSharePct: 70,
      cashStance: { currentCashPct: 5, cashTrend: "STABLE", cashHistory: [] },
      convictionBets: [],
      philosophy: "Test fixture philosophy.",
    },
    disclosureDate: "2026-01-01",
    disclosureUrl: "https://example.com/fixture",
  };
}

describe("Mutual Fund Analytics (synthetic fixtures — not real data)", () => {
  it("computes exact portfolio overlap between two funds", () => {
    const fundA = fixtureFund("a", [
      holding({ symbol: "HDFCBANK", weightPct: 8 }),
      holding({ symbol: "ICICIBANK", weightPct: 6 }),
      holding({ symbol: "RELIANCE", weightPct: 5 }),
    ]);
    const fundB = fixtureFund("b", [
      holding({ symbol: "HDFCBANK", weightPct: 7 }),
      holding({ symbol: "INFY", weightPct: 6 }),
      holding({ symbol: "RELIANCE", weightPct: 4 }),
    ]);

    const overlap = calculateFundOverlap(fundA, fundB);

    // Common: HDFCBANK min(8,7)=7, RELIANCE min(5,4)=4 → 11
    expect(overlap.overlapPct).toBeCloseTo(11, 5);
    expect(overlap.commonHoldingsCount).toBe(2);
    expect(overlap.fundAUniqueCount).toBe(1);
    expect(overlap.fundBUniqueCount).toBe(1);

    const hdfc = overlap.commonHoldings.find((h) => h.symbol === "HDFCBANK");
    expect(hdfc).toBeDefined();
    if (hdfc) {
      expect(hdfc.minWeight).toBe(Math.min(hdfc.weightA, hdfc.weightB));
    }
  });

  it("calculates full overlap when comparing a fund with itself", () => {
    const fund = fixtureFund("a", [
      holding({ symbol: "HDFCBANK", weightPct: 8 }),
      holding({ symbol: "ICICIBANK", weightPct: 6 }),
    ]);
    const selfOverlap = calculateFundOverlap(fund, fund);

    expect(selfOverlap.fundAUniqueCount).toBe(0);
    expect(selfOverlap.fundBUniqueCount).toBe(0);
    expect(selfOverlap.commonHoldingsCount).toBe(fund.holdings.length);
    const totalWeight = fund.holdings.reduce((sum, h) => sum + h.weightPct, 0);
    expect(selfOverlap.overlapPct).toBeCloseTo(totalWeight, 5);
  });

  it("computes institutional accumulation from explicit MoM changes", () => {
    const fundA = fixtureFund("a", [holding({ symbol: "ZOMATO", weightPct: 4, marketValueCr: 80 })]);
    fundA.changesMoM.newEntries = [
      holding({ symbol: "ZOMATO", weightPct: 4, marketValueCr: 80, shares: 2_000_000 }),
    ];
    const fundB = fixtureFund("b", [holding({ symbol: "ZOMATO", weightPct: 3, marketValueCr: 60 })]);
    fundB.changesMoM.accumulated = [
      holding({
        symbol: "ZOMATO",
        weightPct: 3,
        marketValueCr: 60,
        shares: 1_500_000,
        sharesChangePct: 10,
        sharesChangeCount: 150_000,
      }),
    ];

    const accumulation = computeInstitutionalAccumulation([fundA, fundB]);
    const zomato = accumulation.find((s) => s.symbol === "ZOMATO");

    expect(zomato).toBeDefined();
    if (zomato) {
      expect(zomato.netValueBoughtCr).toBeGreaterThan(0);
      expect(zomato.fundsBuyingCount).toBe(2);
      expect(zomato.topBuyers.length).toBe(2);
    }
  });

  it("filters accumulation radar by sector and search", () => {
    const fund = fixtureFund("a", [
      holding({ symbol: "HDFCBANK", sector: "Financial Services", marketCapCategory: "Large Cap" }),
      holding({ symbol: "MIDCAPCO", sector: "Industrials", marketCapCategory: "Mid Cap" }),
    ]);
    // Activity is required for a stock to appear in the radar output.
    fund.changesMoM.newEntries = [
      holding({ symbol: "HDFCBANK", sector: "Financial Services", marketCapCategory: "Large Cap", marketValueCr: 50 }),
      holding({ symbol: "MIDCAPCO", sector: "Industrials", marketCapCategory: "Mid Cap", marketValueCr: 30 }),
    ];
    const accumulation = computeInstitutionalAccumulation([fund]);
    expect(accumulation.length).toBe(2);

    const midCapsOnly = filterAccumulationRadar(accumulation, { marketCap: "Mid Cap" });
    expect(midCapsOnly.length).toBe(1);
    expect(midCapsOnly[0].symbol).toBe("MIDCAPCO");

    const searchResult = filterAccumulationRadar(accumulation, { search: "hdfc" });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].symbol).toBe("HDFCBANK");
  });

  it("aggregates sector-wise institutional capital flows", () => {
    const fund = fixtureFund("a", [holding({ symbol: "ZOMATO", sector: "Consumer", weightPct: 4 })]);
    fund.changesMoM.newEntries = [holding({ symbol: "ZOMATO", sector: "Consumer", marketValueCr: 80 })];

    const flows = getInstitutionalSectorFlows([fund]);
    expect(flows.length).toBeGreaterThan(0);

    const consumer = flows.find((f) => f.sector === "Consumer");
    expect(consumer).toBeDefined();
    if (consumer) {
      expect(consumer.netInflowCr).toBeGreaterThan(0);
    }
  });
});
