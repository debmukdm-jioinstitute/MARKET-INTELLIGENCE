import { describe, expect, it } from "vitest";
import { pickDiverseHeadlines, type LiveMarketHeadline } from "../live-market-headlines";

function h(title: string, bucket: LiveMarketHeadline["bucket"], source: string): LiveMarketHeadline {
  return { title, link: "https://example.com", source, bucket };
}

describe("pickDiverseHeadlines", () => {
  it("does not return only exchange/RBI items when publishers exist", () => {
    const items = [
      h("RBI auction 1", "exchange", "Reserve Bank of India"),
      h("RBI auction 2", "exchange", "Reserve Bank of India"),
      h("RBI auction 3", "exchange", "Reserve Bank of India"),
      h("Nifty slips on global cues", "publisher", "LiveMint"),
      h("SEBI probe into XYZ", "search", "Google News"),
      h("Reliance earnings today", "earnings", "Earnings calendar"),
    ];
    const picked = pickDiverseHeadlines(items, 3);
    const sources = new Set(picked.map((x) => x.bucket));
    expect(picked.length).toBe(3);
    expect(sources.has("exchange")).toBe(true);
    expect(sources.size).toBeGreaterThan(1);
  });
});
