import { describe, expect, it } from "vitest";
import { aggregateLexiconHeadlines, buildFallbackTldr } from "@/lib/hf/news-intel-aggregate";

describe("aggregateLexiconHeadlines", () => {
  it("returns non-zero breakdown for mixed headlines", () => {
    const agg = aggregateLexiconHeadlines([
      "Nifty rally on strong profit growth",
      "Bank fraud probe widens as shares slump",
      "RBI keeps repo rate unchanged",
    ]);
    expect(agg.breakdown.positive + agg.breakdown.negative + agg.breakdown.neutral).toBeCloseTo(1, 5);
    expect(agg.confidence).toBeGreaterThan(0);
    expect(agg.mode).toBe("lexicon");
    expect(agg.breakdown.positive).toBeGreaterThan(0);
    expect(agg.breakdown.negative).toBeGreaterThan(0);
  });

  it("builds fallback tldr from headlines", () => {
    expect(buildFallbackTldr(["Reliance beats estimates"], "positive")).toMatch(/Reliance beats estimates/);
  });
});
