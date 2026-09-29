import { describe, it, expect } from "vitest";
import {
  getAllPromoterActivities,
  filterPromoterActivities,
  getPromoterActivitiesBySymbol,
} from "../database";
import { assessPortfolioPromoterRisk } from "../risk-engine";

describe("Promoter Activity Tracker & Risk Engine", () => {
  it("tracks all 9 essential dimensions of promoter and insider intelligence", () => {
    const activities = getAllPromoterActivities();
    expect(activities.length).toBeGreaterThanOrEqual(15);

    const categories = new Set(activities.map((a) => a.category));

    // Must track all 9 required categories:
    expect(categories.has("PROMOTER_BUYING")).toBe(true);
    expect(categories.has("PROMOTER_SELLING")).toBe(true);
    expect(categories.has("PLEDGE_INCREASE")).toBe(true);
    expect(categories.has("PLEDGE_DECREASE")).toBe(true);
    expect(categories.has("INSIDER_BUYING")).toBe(true);
    expect(categories.has("INSIDER_SELLING")).toBe(true);
    expect(categories.has("LARGE_SHAREHOLDER_CHANGE")).toBe(true);
    expect(categories.has("BLOCK_DEAL")).toBe(true);
    expect(categories.has("BULK_DEAL")).toBe(true);
  });

  it("filters promoter activities by category and search", () => {
    const pledgeIncreases = filterPromoterActivities({ category: "PLEDGE_INCREASE" });
    expect(pledgeIncreases.length).toBeGreaterThan(0);
    expect(pledgeIncreases.every((a) => a.category === "PLEDGE_INCREASE")).toBe(true);

    const tataMotorsActs = filterPromoterActivities({ search: "Tata Motors" });
    expect(tataMotorsActs.length).toBeGreaterThan(0);
    expect(tataMotorsActs[0].symbol).toBe("TATAMOTORS");
  });

  it("feeds promoter pledge increases directly into portfolio risk as a critical hazard", () => {
    const portfolioWithPledge = [
      { symbol: "VEDL", companyName: "Vedanta Limited", weight: 35, marketValueInr: 350000 },
      { symbol: "INFY", companyName: "Infosys Limited", weight: 65, marketValueInr: 650000 },
    ];

    const assessment = assessPortfolioPromoterRisk(portfolioWithPledge);

    expect(assessment.criticalAlertsCount).toBeGreaterThanOrEqual(1);
    expect(assessment.governanceRiskGrade).toBe("HIGH_PLEDGE_RISK");
    expect(assessment.overallGovernanceRiskScore).toBeGreaterThanOrEqual(65);

    const vedlFlag = assessment.flaggedHoldings.find((h) => h.symbol === "VEDL");
    expect(vedlFlag).toBeDefined();
    expect(vedlFlag?.riskSeverity).toBe("CRITICAL");
    expect(vedlFlag?.advisoryNote.toLowerCase()).toContain("pledge");
  });

  it("identifies positive promoter buying and deleveraging tailwinds", () => {
    const portfolioWithBuying = [
      { symbol: "TATAMOTORS", companyName: "Tata Motors", weight: 50, marketValueInr: 500000 },
      { symbol: "ADANIPORTS", companyName: "Adani Ports", weight: 50, marketValueInr: 500000 },
    ];

    const assessment = assessPortfolioPromoterRisk(portfolioWithBuying);

    expect(assessment.criticalAlertsCount).toBe(0);
    expect(assessment.positiveSignalsCount).toBeGreaterThanOrEqual(2);
    expect(assessment.governanceRiskGrade).toBe("LOW");

    const tataFlag = assessment.flaggedHoldings.find((h) => h.symbol === "TATAMOTORS");
    expect(tataFlag?.riskSeverity).toBe("POSITIVE");
  });

  it("handles empty portfolios gracefully with clean default risk", () => {
    const assessment = assessPortfolioPromoterRisk([]);
    expect(assessment.totalHeldPositionsScanned).toBe(0);
    expect(assessment.overallGovernanceRiskScore).toBeLessThanOrEqual(20);
    expect(assessment.governanceRiskGrade).toBe("LOW");
  });
});
