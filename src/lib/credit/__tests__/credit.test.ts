import { describe, it, expect } from "vitest";
import {
  getAllCreditActivities,
  filterCreditActivities,
  getCreditActivityBySymbol,
  getSmallcapFundsCreditProfiles,
  filterSmallcapFundsCreditProfiles,
  getCreditDataAvailability,
  assessPortfolioCreditRisk,
} from "../database";

describe("Credit & Risk Intelligence (no live feed)", () => {
  it("reports the credit feed as unavailable", () => {
    const availability = getCreditDataAvailability();
    expect(availability.dataStatus).toBe("UNAVAILABLE");
    expect(availability.message.length).toBeGreaterThan(0);
  });

  it("returns no credit activities", () => {
    expect(getAllCreditActivities()).toEqual([]);
    expect(filterCreditActivities({ agency: "CRISIL" })).toEqual([]);
    expect(filterCreditActivities()).toEqual([]);
    expect(getCreditActivityBySymbol("TATAMOTORS")).toEqual([]);
  });

  it("returns no smallcap fund credit profiles", () => {
    expect(getSmallcapFundsCreditProfiles()).toEqual([]);
    expect(filterSmallcapFundsCreditProfiles("Nippon")).toEqual([]);
  });

  it("never invents a credit health score or grade", () => {
    const assessment = assessPortfolioCreditRisk([
      { symbol: "TATAMOTORS", companyName: "Tata Motors", weight: 50, marketValueInr: 500000 },
      { symbol: "BHARTIARTL", companyName: "Bharti Airtel", weight: 50, marketValueInr: 500000 },
    ]);

    expect(assessment.dataStatus).toBe("UNAVAILABLE");
    expect(assessment.flaggedHoldings).toEqual([]);
    expect(assessment.holdingsWithDowngradeCount).toBe(0);
    expect(assessment.holdingsWithUpgradeCount).toBe(0);
    expect(assessment.holdingsWithLiquidityConcernsCount).toBe(0);
    expect(assessment.capitalInDowngradedDebtCr).toBe(0);
    expect(assessment.capitalInUpgradedDebtCr).toBe(0);
    expect(assessment.message).toContain("not connected");
  });

  it("returns unavailable for an empty portfolio too", () => {
    const assessment = assessPortfolioCreditRisk([]);
    expect(assessment.dataStatus).toBe("UNAVAILABLE");
    expect(assessment.totalHeldPositionsScanned).toBe(0);
    expect(assessment.flaggedHoldings).toEqual([]);
  });
});
