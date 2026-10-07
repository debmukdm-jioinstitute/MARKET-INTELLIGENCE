import { describe, expect, it } from "vitest";
import { scoreConfidence, validateCards, type InsightFact } from "@/lib/insights/engine";

const facts: InsightFact[] = [
  { id: "px_chg", label: "Change", value: "+1.20% (₹3.90)", source: "Upstox", asOf: new Date().toISOString(), tier: 2 },
  { id: "news_1", label: "Headline", value: "Company wins order", source: "https://x", asOf: null, tier: 3 },
];

describe("insight engine", () => {
  it("keeps grounded cards and drops invented ids, numbers and advice", () => {
    const cards = validateCards(
      [
        { kind: "price_move", headline: "Shares up 1.20% today", reasons: [{ text: "Up 1.20% vs previous close.", factIds: ["px_chg"] }] },
        { kind: "price_move", headline: "Shares up 9.99%", reasons: [{ text: "Up 9.99%.", factIds: ["px_chg"] }] },
        { kind: "news_flow", headline: "You should buy now", reasons: [{ text: "Order win.", factIds: ["news_1"] }] },
        { kind: "valuation", headline: "Cheap", reasons: [{ text: "Cheap.", factIds: ["made_up"] }] },
      ],
      facts,
      "TEST",
    );
    expect(cards.map((c) => c.headline)).toEqual(["Shares up 1.20% today"]);
    expect(cards[0]!.facts.map((f) => f.id)).toEqual(["px_chg"]);
  });

  it("scores confidence deterministically", () => {
    const c = scoreConfidence({ reasons: [{ text: "x", factIds: ["px_chg"] }] }, facts);
    expect(c.score).toBeGreaterThan(0);
    expect(["High", "Medium", "Low"]).toContain(c.level);
    expect(scoreConfidence({ reasons: [] }, facts).level).toBe("Low");
  });
});
