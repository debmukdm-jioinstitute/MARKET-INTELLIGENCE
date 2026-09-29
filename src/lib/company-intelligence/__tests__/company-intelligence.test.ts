import { describe, it, expect } from "vitest";
import {
  getCompanyIntelligenceProfile,
  generateSyntheticCompanyProfile,
  getFeaturedIntelligenceSymbols,
} from "../database";

describe("Company-Specific & Concall Intelligence Engine", () => {
  it("loads flagship profile for TATAMOTORS with user-specified timeline disclosures", () => {
    const profile = getCompanyIntelligenceProfile("TATAMOTORS");
    expect(profile.symbol).toBe("TATAMOTORS");
    expect(profile.companyName).toContain("Tata Motors");

    // Check timeline events
    const timeline = profile.timeline;
    expect(timeline.length).toBeGreaterThanOrEqual(6);

    const dates = timeline.map((t) => t.displayDate);
    expect(dates).toContain("29 Sep"); // Regulatory filing
    expect(dates).toContain("22 Sep"); // Investor presentation
    expect(dates).toContain("18 Sep"); // Credit-rating action
    expect(dates).toContain("12 Sep"); // Management commentary
    expect(dates).toContain("08 Sep"); // Acquisition announcement
    expect(dates).toContain("02 Sep"); // Production update

    const types = timeline.map((t) => t.type);
    expect(types).toContain("REGULATORY_FILING");
    expect(types).toContain("INVESTOR_PRESENTATION");
    expect(types).toContain("CREDIT_RATING");
    expect(types).toContain("MANAGEMENT_COMMENTARY");
    expect(types).toContain("ACQUISITION_MNA");
    expect(types).toContain("PRODUCTION_UPDATE");
  });

  it("extracts AI-generated 'What Changed?' delta analysis with dimensional variances", () => {
    const profile = getCompanyIntelligenceProfile("TATAMOTORS");
    const delta = profile.whatChanged;

    expect(delta.period).toBeDefined();
    expect(delta.executiveSynthesis).toContain("Tata Motors");
    expect(["POSITIVE_INFLECTION", "NEUTRAL_EXECUTION", "CAUTIONARY_HEADWINDS"]).toContain(
      delta.netDirection
    );

    expect(delta.dimensions.length).toBeGreaterThanOrEqual(3);
    const firstDim = delta.dimensions[0];
    expect(firstDim.dimension).toBeDefined();
    expect(firstDim.priorQuarter).toBeDefined();
    expect(firstDim.currentQuarter).toBeDefined();
    expect(firstDim.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(["UPGRADE", "DOWNGRADE", "MAINTAINED", "PIVOT"]).toContain(firstDim.verdict);

    expect(delta.catalystsToWatch.length).toBeGreaterThan(0);
    expect(delta.keyRiskAlerts.length).toBeGreaterThan(0);
  });

  it("extracts comprehensive concall dimensions and institutional analyst Q&A", () => {
    const profile = getCompanyIntelligenceProfile("TATAMOTORS");
    const cc = profile.latestConcall;

    expect(cc.quarter).toBe("Q1 FY26");
    expect(cc.headlineVerdict).toBeDefined();

    // Check 10+ concall dimensions
    const dims = cc.dimensions;
    expect(dims.managementConfidence.score).toBeGreaterThan(0);
    expect(["BULLISH", "OPTIMISTIC", "NEUTRAL", "CAUTIOUS", "DEFENSIVE"]).toContain(
      dims.managementConfidence.stance
    );
    expect(dims.revenueOutlook.targetGrowthPct).toBeDefined();
    expect(dims.marginOutlook.targetMarginPct).toBeDefined();
    expect(dims.capex.outlayInrCr).toBeGreaterThan(0);
    expect(dims.demand.environment).toBeDefined();
    expect(dims.pricing.pricingPower).toBeDefined();
    expect(dims.competition.intensity).toBeDefined();
    expect(dims.commodityCosts.trend).toBeDefined();
    expect(dims.hiring.headcountTrend).toBeDefined();
    expect(dims.guidanceChanges.status).toBeDefined();

    // Check analyst Q&A
    expect(cc.analystQA.length).toBeGreaterThanOrEqual(2);
    const morganStanleyQA = cc.analystQA.find((q) => q.firm.includes("Morgan Stanley"));
    expect(morganStanleyQA).toBeDefined();
    expect(morganStanleyQA?.question).toContain("inventory");
    expect(morganStanleyQA?.verbatimExcerpt).toBeDefined();
    expect(["CONFIDENT", "GUARDED", "CONCILIATORY"]).toContain(morganStanleyQA?.tone);
  });

  it("tracks multi-quarter management tone trajectory with sentiment scoring", () => {
    const profile = getCompanyIntelligenceProfile("TATAMOTORS");
    const trajectory = profile.historicalToneTrajectory;

    expect(trajectory.length).toBeGreaterThanOrEqual(5);
    const quarters = trajectory.map((t) => t.quarter);
    expect(quarters).toContain("Q1 FY25");
    expect(quarters).toContain("Q4 FY25");
    expect(quarters).toContain("Q1 FY26");

    for (const q of trajectory) {
      expect(q.score).toBeGreaterThanOrEqual(0);
      expect(q.score).toBeLessThanOrEqual(100);
      expect(["BULLISH", "OPTIMISTIC", "NEUTRAL", "CAUTIOUS", "DEFENSIVE"]).toContain(q.tone);
      expect(q.keyTheme).toBeDefined();
    }
  });

  it("generates coherent algorithmic profiles for any unlisted or long-tail ticker", () => {
    const randomSymbol = "TVSMOTOR";
    const profile = generateSyntheticCompanyProfile(randomSymbol);

    expect(profile.symbol).toBe("TVSMOTOR");
    expect(profile.timeline.length).toBeGreaterThanOrEqual(5);
    expect(profile.irDocuments.length).toBeGreaterThanOrEqual(4);
    expect(profile.whatChanged.dimensions.length).toBeGreaterThanOrEqual(3);
    expect(profile.latestConcall.dimensions.managementConfidence.score).toBeGreaterThan(0);
  });

  it("crawls full IR document taxonomy across 8 core disclosure types", () => {
    const profile = getCompanyIntelligenceProfile("TATAMOTORS");
    const docs = profile.irDocuments;

    const categories = docs.map((d) => d.category);
    expect(categories).toContain("INVESTOR_PRESENTATION");
    expect(categories).toContain("EARNINGS_RELEASE");
    expect(categories).toContain("ANNUAL_REPORT");
    expect(categories).toContain("ESG_REPORT");
    expect(categories).toContain("PRESS_RELEASE");
    expect(categories).toContain("MANAGEMENT_COMMENTARY");
    expect(categories).toContain("EVENTS");
    expect(categories).toContain("CONCALL_MATERIALS");
  });
});
