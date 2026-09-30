import { describe, expect, it } from "vitest";
import { scoreTitleSentiment, tallySentiment } from "../lexicon-sentiment";

describe("scoreTitleSentiment", () => {
  it("flags a clearly bullish real-style title as positive only", () => {
    const s = scoreTitleSentiment("Why I'm bullish on this stock — target price looks undervalued");
    expect(s).toEqual({ positive: true, negative: false });
  });

  it("flags a clearly bearish real-style title as negative only", () => {
    const s = scoreTitleSentiment("Time to sell? Weak results and a downgrade this week");
    expect(s).toEqual({ positive: false, negative: true });
  });

  it("flags neither for a plain factual/question title", () => {
    const s = scoreTitleSentiment("Anyone track the quarterly results date for this company?");
    expect(s).toEqual({ positive: false, negative: false });
  });

  it("matches whole words, not substrings of unrelated words (e.g. 'cheap' inside 'cheaper')", () => {
    // 'cheap' is a positive-list word; 'cheaper' containing it as a substring must not false-positive
    // via a naive .includes() check.
    const s = scoreTitleSentiment("This broker's fees got cheaper but the app is buggy");
    expect(s.positive).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(scoreTitleSentiment("BULLISH on this one, might BUY more")).toEqual({ positive: true, negative: false });
  });
});

describe("tallySentiment", () => {
  it("returns all zeros for an empty title list instead of dividing by zero", () => {
    expect(tallySentiment([])).toEqual({ positivePct: 0, negativePct: 0, neutralPct: 0, netSentimentScore: 0 });
  });

  it("percentages sum to 100 and reflect real per-title counts", () => {
    const titles = [
      "Bullish on this, buying more", // positive
      "Bearish, time to sell",        // negative
      "What's the ticker for this company?", // neutral
      "Another neutral question about filings", // neutral
    ];
    const t = tallySentiment(titles);
    expect(t.positivePct + t.negativePct + t.neutralPct).toBe(100);
    expect(t.positivePct).toBe(25);
    expect(t.negativePct).toBe(25);
    expect(t.netSentimentScore).toBe(0);
  });

  it("a title matching both word lists counts as half toward each, not a double count", () => {
    const t = tallySentiment(["Bullish long term but bearish short term — mixed signals"]);
    expect(t.positivePct).toBe(50);
    expect(t.negativePct).toBe(50);
  });
});
