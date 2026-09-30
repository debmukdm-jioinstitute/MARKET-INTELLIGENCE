import { describe, it, expect } from "vitest";
import {
  PROMOTER_DATA_STATUS,
  getAllPromoterActivities,
  filterPromoterActivities,
  getPromoterActivitiesBySymbol,
} from "../database";
import { assessPortfolioPromoterRisk } from "../risk-engine";

describe("Promoter Activity Tracker & Risk Engine (no live feed)", () => {
  it("reports the disclosure feed as unavailable", () => {
    expect(PROMOTER_DATA_STATUS).toBe("UNAVAILABLE");
  });

  it("returns no fabricated activity records from any accessor", () => {
    expect(getAllPromoterActivities()).toEqual([]);
    expect(filterPromoterActivities({ category: "PLEDGE_INCREASE" })).toEqual([]);
    expect(filterPromoterActivities({ search: "Tata Motors" })).toEqual([]);
    expect(getPromoterActivitiesBySymbol("RELIANCE")).toEqual([]);
  });

  it("returns an explicit UNAVAILABLE assessment instead of invented risk scores", () => {
    const assessment = assessPortfolioPromoterRisk([
      { symbol: "RELIANCE", companyName: "Reliance Industries", weight: 50, marketValueInr: 500000 },
      { symbol: "INFY", companyName: "Infosys", weight: 50, marketValueInr: 500000 },
    ]);

    expect(assessment.dataStatus).toBe("UNAVAILABLE");
    expect(assessment.flaggedHoldings).toEqual([]);
    expect(assessment.criticalAlertsCount).toBe(0);
    expect(assessment.warningAlertsCount).toBe(0);
    expect(assessment.positiveSignalsCount).toBe(0);
    expect(assessment.pledgeRiskExposureCr).toBe(0);
    expect(assessment.promoterSellingExposureCr).toBe(0);
    expect(assessment.promoterBuyingSupportCr).toBe(0);
    expect(assessment.recommendationSummary).toMatch(/not connected/i);
  });

  it("handles empty portfolios with the same unavailable result", () => {
    const assessment = assessPortfolioPromoterRisk([]);
    expect(assessment.dataStatus).toBe("UNAVAILABLE");
    expect(assessment.totalHeldPositionsScanned).toBe(0);
    expect(assessment.flaggedHoldings).toEqual([]);
  });
});
