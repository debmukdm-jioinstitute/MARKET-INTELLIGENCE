import { describe, it, expect } from "vitest";
import {
  createHonestLowChatterProfile,
  getAllRetailSentimentData,
  TRACKED_SUBREDDITS,
  RETAIL_INVESTOR_PROBLEMS,
} from "../database";

describe("Reddit Retail Sentiment Engine & Alternative Data", () => {
  it("returns an honest low-chatter profile with zeroed metrics (never invented)", () => {
    const data = createHonestLowChatterProfile("FLUOROCHEM", "Fluorochem Ltd", "Chemicals");
    expect(data.symbol).toBe("FLUOROCHEM");
    expect(data.dataStatus).toBe("LOW_CHATTER");
    expect(data.totalMentions7D).toBe(0);
    expect(data.positivePct).toBe(0);
    expect(data.negativePct).toBe(0);
    expect(data.neutralPct).toBe(0);
    expect(data.topRetailDebates).toHaveLength(0); // Never invents fake debates
    expect(data.statusNotice).toBeDefined();
    expect(data.statusNotice).toContain("Minimal organic retail discussion");
  });

  it("monitors all 10 requested financial communities across India and global markets", () => {
    const ids = TRACKED_SUBREDDITS.map((s) => s.id);
    expect(ids).toContain("r/IndiaInvestments");
    expect(ids).toContain("r/IndianStreetBets");
    expect(ids).toContain("r/IndianStockMarket");
    expect(ids).toContain("r/IndiaStocks");
    expect(ids).toContain("r/personalfinanceindia");
    expect(ids).toContain("r/ValueInvesting");
    expect(ids).toContain("r/investing");
    expect(ids).toContain("r/stocks");
    expect(ids).toContain("r/options");
    expect(ids).toContain("r/algotrading");
    expect(TRACKED_SUBREDDITS.length).toBe(10);
  });

  it("surfaces investor problems across research, portfolio tracking, taxes, and info discovery", () => {
    const categories = RETAIL_INVESTOR_PROBLEMS.map((p) => p.category);
    expect(categories).toContain("RESEARCH");
    expect(categories).toContain("PORTFOLIO_TRACKING");
    expect(categories).toContain("TAXES");
    expect(categories).toContain("FINDING_INFO");

    for (const prob of RETAIL_INVESTOR_PROBLEMS) {
      expect(prob.headline).toBeDefined();
      expect(prob.problemDescription).toBeDefined();
      expect(prob.conventionalDatasetBlindspot).toBeDefined();
      expect(prob.sampleCommunityQueries.length).toBeGreaterThan(0);
      expect(prob.miSolutionFeature.featureTitle).toBeDefined();
      expect(prob.miSolutionFeature.href).toBeDefined();
      // Sample queries are editorial examples only — no invented quotes or vote counts
      for (const q of prob.sampleCommunityQueries) {
        expect(q.subreddit).toBeDefined();
        expect(q.queryTitle).toBeDefined();
        expect(q).not.toHaveProperty("quoteExcerpt");
        expect(q).not.toHaveProperty("upvotes");
        expect(q).not.toHaveProperty("commentsCount");
      }
      expect(prob).not.toHaveProperty("monthlyMentionGrowthPct");
    }
  });

  it("serves hub data without any fabricated per-company stats or euphoria scores", () => {
    const hub = getAllRetailSentimentData();
    expect(hub.trackedSubreddits.length).toBe(10);
    expect(hub.investorProblems.length).toBeGreaterThan(0);
    expect(hub).not.toHaveProperty("companies");
    expect(hub).not.toHaveProperty("overallMarketSentiment");
  });
});
