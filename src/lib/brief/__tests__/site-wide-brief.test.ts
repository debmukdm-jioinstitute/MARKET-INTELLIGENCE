import { describe, expect, it, vi } from "vitest";

// All external I/O is mocked: this test must be deterministic and offline.
vi.mock("@/lib/db", () => ({
  hasDatabase: () => false,
  ensureSchema: async () => undefined,
  sql: () => async () => [],
}));
vi.mock("@/lib/reddit-sentiment/live-cache", () => ({ getWatchlistLiveSentiment: async () => [] }));
vi.mock("@/lib/feeds/india/build-dashboard", () => ({
  buildIndiaDashboardQuick: async () => {
    throw new Error("offline");
  },
}));
vi.mock("@/lib/legal-risk/build-hub", () => ({
  buildLegalRiskHub: async () => {
    throw new Error("offline");
  },
}));
vi.mock("@/lib/feeds/sources/upstox", () => ({
  fetchUpstoxIpoList: async () => {
    throw new Error("offline");
  },
}));
vi.mock("@/lib/feeds/ipo/enrich-gmp", () => ({ enrichIpoListWithGmp: async (x: unknown) => x }));
vi.mock("@/lib/brief/live-market-headlines", () => ({ fetchLiveMarketHeadlines: async () => [] }));
vi.mock("@/lib/feeds/india/nse-market", () => ({
  fetchNseOptionChain: async () => {
    throw new Error("offline");
  },
}));

import { buildSiteWideExecutiveBrief } from "../site-wide-brief";

describe("Site-Wide Executive Briefing Engine", () => {
  it("builds the 10-pillar brief and degrades honestly when every live feed is down", async () => {
    const brief = await buildSiteWideExecutiveBrief();

    expect(brief.briefId).toBeDefined();
    expect(brief.executiveHeadline).toBeDefined();
    expect(brief.executiveSummary).toBeDefined();
    expect(["Bullish", "Defensive", "Neutral"]).toContain(brief.stance);
    expect(brief.stanceScore).toBeGreaterThanOrEqual(0);
    expect(brief.stanceScore).toBeLessThanOrEqual(100);

    const ids = brief.pillars.map((p) => p.id);
    expect(ids).toEqual([
      "broker-research",
      "promoter-insider",
      "credit-risk",
      "company-concall",
      "mutual-funds",
      "retail-sentiment",
      "macro-liquidity",
      "options-derivatives",
      "ipo-pipeline",
      "legal-regulatory",
    ]);

    for (const pillar of brief.pillars) {
      expect(pillar.metrics.length).toBeGreaterThan(0);
      expect(Array.isArray(pillar.featuredEntities)).toBe(true);
      expect(pillar.deepDiveUrl).toMatch(/^\//);
      expect(pillar.deepDiveLabel.length).toBeGreaterThan(0);
    }

    expect(brief.keyThemes.length).toBeGreaterThanOrEqual(1);
    expect(brief.watchToday.length).toBeGreaterThanOrEqual(1);
    // Official-source fallbacks always present — no fabricated headlines.
    expect(brief.regulatorHeadlines.length).toBeGreaterThanOrEqual(1);
  });
});
