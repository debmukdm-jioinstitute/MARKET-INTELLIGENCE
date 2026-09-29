import { describe, it, expect } from "vitest";
import {
  getAllCreditActivities,
  filterCreditActivities,
  assessPortfolioCreditRisk,
} from "../database";

describe("Credit & Risk Intelligence", () => {
  it("monitors all 6 major Indian credit rating agencies", () => {
    const activities = getAllCreditActivities();
    const agencies = new Set(activities.map((a) => a.agency));

    expect(agencies.has("CRISIL")).toBe(true);
    expect(agencies.has("ICRA")).toBe(true);
    expect(agencies.has("CARE Ratings")).toBe(true);
    expect(agencies.has("India Ratings")).toBe(true);
    expect(agencies.has("Acuité")).toBe(true);
    expect(agencies.has("Brickwork")).toBe(true);
  });

  it("tracks all 7 required credit actions", () => {
    const activities = getAllCreditActivities();
    const actions = new Set(activities.map((a) => a.action));

    expect(actions.has("RATING_UPGRADE")).toBe(true);
    expect(actions.has("RATING_DOWNGRADE")).toBe(true);
    expect(actions.has("OUTLOOK_CHANGE")).toBe(true);
    expect(actions.has("CREDIT_WATCH")).toBe(true);
    expect(actions.has("DEFAULT")).toBe(true);
    expect(actions.has("DEBT_RESTRUCTURING")).toBe(true);
    expect(actions.has("LIQUIDITY_CONCERN")).toBe(true);
  });

  it("connects credit rating actions to equity stock prices", () => {
    const activities = getAllCreditActivities();

    for (const act of activities) {
      const eq = act.equityConnection;
      expect(eq.currentPriceInr).toBeGreaterThan(0);
      expect(eq.priceAtActionInr).toBeGreaterThan(0);
      expect(Number.isFinite(eq.equityReturnSinceActionPct)).toBe(true);
      expect(Number.isFinite(eq.impliedCreditSpreadBps)).toBe(true);
      expect(eq.transmission).toBeDefined();
      expect(eq.equityImpactAnalysis.length).toBeGreaterThan(15);
    }

    // Verify upgrade equity transmission on Tata Motors
    const tata = activities.find((a) => a.symbol === "TATAMOTORS");
    expect(tata).toBeDefined();
    expect(tata?.action).toBe("RATING_UPGRADE");
    expect(tata?.equityConnection.equityReturnSinceActionPct).toBeGreaterThan(0);
    expect(tata?.equityConnection.transmission).toBe("DELEVERAGING_EXPANSION");

    // Verify distress discount transmission on Reliance Capital
    const relCap = activities.find((a) => a.symbol === "RELCAPITAL");
    expect(relCap).toBeDefined();
    expect(relCap?.action).toBe("DEFAULT");
    expect(relCap?.equityConnection.equityReturnSinceActionPct).toBeLessThan(0);
  });

  it("feeds credit downgrades and defaults into portfolio risk engine", () => {
    const distressedPortfolio = [
      { symbol: "RELCAPITAL", companyName: "Reliance Capital", weight: 30, marketValueInr: 300000 },
      { symbol: "VEDL", companyName: "Vedanta Limited", weight: 40, marketValueInr: 400000 },
      { symbol: "SPARC", companyName: "SPARC", weight: 30, marketValueInr: 300000 },
    ];

    const assessment = assessPortfolioCreditRisk(distressedPortfolio);

    expect(assessment.creditHealthGrade).toBe("HIGH_CREDIT_DISTRESS");
    expect(assessment.portfolioCreditHealthScore).toBeLessThan(50);
    expect(assessment.holdingsWithDowngradeCount).toBeGreaterThanOrEqual(2);
    expect(assessment.capitalInDowngradedDebtCr).toBeGreaterThan(0);
  });

  it("identifies high credit health when holding investment-grade upgraded issuers", () => {
    const pristinePortfolio = [
      { symbol: "TATAMOTORS", companyName: "Tata Motors", weight: 50, marketValueInr: 500000 },
      { symbol: "BHARTIARTL", companyName: "Bharti Airtel", weight: 50, marketValueInr: 500000 },
    ];

    const assessment = assessPortfolioCreditRisk(pristinePortfolio);

    expect(assessment.creditHealthGrade).toBe("AAA_PRUDENT");
    expect(assessment.portfolioCreditHealthScore).toBeGreaterThanOrEqual(80);
    expect(assessment.holdingsWithUpgradeCount).toBeGreaterThanOrEqual(2);
  });
});
