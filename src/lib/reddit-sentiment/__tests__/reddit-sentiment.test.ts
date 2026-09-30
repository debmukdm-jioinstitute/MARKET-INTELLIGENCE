import { describe, it, expect } from "vitest";
import {
  getCompanyRetailSentiment,
  getAllRetailSentimentData,
  generateSyntheticRetailSentiment,
  TRACKED_SUBREDDITS,
  RETAIL_INVESTOR_PROBLEMS,
} from "../database";

describe("Reddit Retail Sentiment Engine & Alternative Data", () => {
  it("tracks RELIANCE sentiment matching prompt specifications", () => {
    const data = getCompanyRetailSentiment("RELIANCE");
    expect(data.symbol).toBe("RELIANCE");
    expect(data.dataStatus).toBe("VERIFIED_ACTIVE");
    expect(data.mentionChangePct7D).toBe(142); // Mentions: +142%
    expect(data.positivePct).toBe(61);        // Positive: 61%
    expect(data.negativePct).toBe(24);        // Negative: 24%
    expect(data.neutralPct).toBe(15);         // Neutral: 15%
    expect(data.sentimentMomentum).toBe("ACCELERATING_BULLISH"); // Momentum: ↑

    // Check most discussed topics: Jio, O2C, Retail, Valuation, AGM
    expect(data.mostDiscussedTopics).toContain("Jio");
    expect(data.mostDiscussedTopics).toContain("O2C");
    expect(data.mostDiscussedTopics).toContain("Retail");
    expect(data.mostDiscussedTopics).toContain("Valuation");
    expect(data.mostDiscussedTopics).toContain("AGM");

    // Check debate theses
    expect(data.topRetailDebates.length).toBeGreaterThan(0);
    const jioDebate = data.topRetailDebates.find((d) => d.topic.includes("Jio"));
    expect(jioDebate).toBeDefined();
    expect(jioDebate?.bullThesis).toBeDefined();
    expect(jioDebate?.bearThesis).toBeDefined();
    expect(jioDebate?.consensusVerdict).toBeDefined();
  });

  it("handles quiet or institutional stocks honestly without fake debates or fabricated comments", () => {
    // FLUOROCHEM is in NIFTY 500 but not a high-social-buzz retail favorite
    const data = getCompanyRetailSentiment("FLUOROCHEM");
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

  it("provides verified active profiles for major Indian retail market darlings", () => {
    const paytm = getCompanyRetailSentiment("PAYTM");
    expect(paytm.dataStatus).toBe("VERIFIED_ACTIVE");
    expect(paytm.topRetailDebates.length).toBeGreaterThan(0);

    const zomato = getCompanyRetailSentiment("ZOMATO");
    expect(zomato.dataStatus).toBe("VERIFIED_ACTIVE");
    expect(zomato.mostDiscussedTopics).toContain("Blinkit GOV");

    const trent = getCompanyRetailSentiment("TRENT");
    expect(trent.dataStatus).toBe("VERIFIED_ACTIVE");
    expect(trent.mostDiscussedTopics).toContain("Zudio Phenomenon");

    const hal = getCompanyRetailSentiment("HAL");
    expect(hal.dataStatus).toBe("VERIFIED_ACTIVE");
    expect(hal.totalMentions7D).toBeGreaterThan(1000);
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
    }
  });

  it("generates coherent sentiment metrics for arbitrary tickers in legacy generator", () => {
    const data = generateSyntheticRetailSentiment("VEDL");
    expect(data.symbol).toBe("VEDL");
    expect(data.totalMentions7D).toBeGreaterThan(0);
    expect(data.positivePct + data.negativePct + data.neutralPct).toBe(100);
    expect(data.communityDistribution.length).toBeGreaterThan(0);
    expect(data.sentimentHistory30D.length).toBe(5);
  });

  it("returns overall market sentiment with retail euphoria score and divergence insights", () => {
    const hub = getAllRetailSentimentData();
    expect(hub.companies.length).toBeGreaterThanOrEqual(500);
    expect(hub.overallMarketSentiment.retailEuphoriaScore).toBeGreaterThan(0);
    expect(hub.overallMarketSentiment.retailEuphoriaScore).toBeLessThanOrEqual(100);
    expect(hub.overallMarketSentiment.mostHypedTickers.length).toBeGreaterThan(0);
    expect(hub.overallMarketSentiment.mostHatedTickers.length).toBeGreaterThan(0);
  });
});
