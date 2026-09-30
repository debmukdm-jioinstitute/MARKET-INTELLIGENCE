import { describe, expect, it } from "vitest";
import { buildSiteWideExecutiveBrief } from "../site-wide-brief";

describe("Site-Wide Executive Briefing Engine", () => {
  it("builds a comprehensive site-wide brief spanning all 10 intelligence pillars", async () => {
    const brief = await buildSiteWideExecutiveBrief();

    expect(brief.briefId).toBeDefined();
    expect(brief.executiveHeadline).toBeDefined();
    expect(brief.executiveSummary).toBeDefined();
    expect(brief.stance).toBe("Bullish");
    expect(brief.stanceScore).toBeGreaterThan(0);

    // Verify macro pulse metrics
    expect(brief.macroPulse.nifty.val).toBeDefined();
    expect(brief.macroPulse.fiiNetCr.val).toBeDefined();
    expect(brief.macroPulse.rbiLiquidity.val).toBeDefined();

    // Verify all 10 site-wide pillars exist
    const pillarIds = brief.pillars.map((p) => p.id);
    const expectedPillars = [
      "broker-consensus",
      "promoter-insider",
      "credit-risk",
      "company-concall",
      "mutual-funds",
      "retail-sentiment",
      "macro-liquidity",
      "options-derivatives",
      "ipo-pipeline",
      "legal-regulatory",
    ];

    for (const expected of expectedPillars) {
      expect(pillarIds).toContain(expected);
    }
    expect(brief.pillars.length).toBe(10);

    // Verify each pillar has metrics, featured entities, and deep dive links
    for (const pillar of brief.pillars) {
      expect(pillar.metrics.length).toBeGreaterThan(0);
      expect(pillar.featuredEntities.length).toBeGreaterThan(0);
      expect(pillar.deepDiveUrl).toMatch(/^\//);
      expect(pillar.deepDiveLabel.length).toBeGreaterThan(0);
    }

    // Verify cross-asset themes and what-to-watch items
    expect(brief.keyThemes.length).toBeGreaterThanOrEqual(4);
    expect(brief.watchToday.length).toBeGreaterThanOrEqual(3);
    expect(brief.regulatorHeadlines.length).toBeGreaterThanOrEqual(3);
  });
});
