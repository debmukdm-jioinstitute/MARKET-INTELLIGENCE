import { describe, expect, it } from "vitest";
import {
  breadthFor,
  clamp100,
  explainWhy,
  importance,
  rankOf,
  rarityFromZ,
  tierOf,
  timeDecay,
  TIER_CRITICAL,
  TIER_NOTEWORTHY,
} from "../smart/score";
import { inQuietHours, relevanceFor, type UserContext } from "../smart/relevance";

describe("score", () => {
  it("clamps to 0–100", () => {
    expect(clamp100(150)).toBe(100);
    expect(clamp100(-5)).toBe(0);
    expect(clamp100(NaN)).toBe(50);
  });
  it("maps z-scores to rarity", () => {
    expect(rarityFromZ(0)).toBe(0);
    expect(rarityFromZ(3)).toBe(100);
    expect(rarityFromZ(-5)).toBe(100);
    expect(rarityFromZ(1.5)).toBe(50);
  });
  it("weights severity highest", () => {
    expect(importance(100, 0, 0)).toBe(50);
    expect(importance(0, 100, 0)).toBe(30);
    expect(importance(0, 0, 100)).toBe(20);
  });
  it("breadth favors macro and Nifty-50", () => {
    expect(breadthFor({ isMacro: true })).toBe(95);
    expect(breadthFor({ isNifty50: true })).toBe(90);
    expect(breadthFor({})).toBe(40);
  });
  it("tiers split at 80/50", () => {
    expect(tierOf(85)).toBe("critical");
    expect(tierOf(79)).toBe("noteworthy");
    expect(tierOf(49)).toBe("info");
    expect(TIER_CRITICAL).toBe(80);
    expect(TIER_NOTEWORTHY).toBe(50);
  });
  it("decays with 12h half-life", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    expect(timeDecay(now, now)).toBe(1);
    expect(timeDecay(new Date("2026-10-03T00:00:00Z"), now)).toBeCloseTo(0.5, 5);
    expect(timeDecay(new Date("2026-10-02T12:00:00Z"), now)).toBeCloseTo(0.25, 5);
  });
  it("ranks importance × relevance × decay", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    expect(rankOf(100, 1, now, now)).toBe(1);
    expect(rankOf(100, 0.5, now, now)).toBe(0.5);
    expect(rankOf(80, 1, new Date("2026-10-03T00:00:00Z"), now)).toBeCloseTo(0.4, 5);
  });
  it("explains plainly", () => {
    const w = explainWhy({ what: "Fell 4.2%.", magnitude: "Biggest drop in 8 months.", personalNote: "You hold it." });
    expect(w).toContain("Fell 4.2%.");
    expect(w).toContain("You hold it.");
  });
});

const ctx: UserContext = {
  email: "u@x.in",
  holdings: [{ symbol: "RELIANCE", sector: "Oil & Gas" }],
  viewedSymbols: ["TCS"],
  affinity: { broker: 0.8 },
};

describe("relevance", () => {
  it("ranks holdings first", () => {
    expect(relevanceFor({ symbol: "RELIANCE", category: "market" }, ctx)).toBe(1.0);
  });
  it("viewed symbols next", () => {
    expect(relevanceFor({ symbol: "TCS", category: "market" }, ctx)).toBe(0.7);
  });
  it("sector affinity after that", () => {
    expect(relevanceFor({ symbol: "ONGC", category: "market", sector: "Oil & Gas" }, ctx)).toBe(0.5);
  });
  it("falls back to category affinity", () => {
    expect(relevanceFor({ symbol: "XYZ", category: "broker" }, ctx)).toBe(0.8);
    expect(relevanceFor({ symbol: "XYZ", category: "macro" }, ctx)).toBe(0.5);
  });
  it("guests get flat relevance", () => {
    const g: UserContext = { email: null, holdings: [], viewedSymbols: [], affinity: {} };
    expect(relevanceFor({ symbol: "RELIANCE", category: "market" }, g)).toBe(0.5);
  });
  it("quiet hours wrap midnight", () => {
    const at = (istH: number) => new Date(Date.UTC(2026, 9, 2, istH, 0) - 5.5 * 3_600_000); // IST = UTC+5:30
    expect(inQuietHours(22, 8, at(23))).toBe(true);
    expect(inQuietHours(22, 8, at(7))).toBe(true);
    expect(inQuietHours(22, 8, at(12))).toBe(false);
    expect(inQuietHours(22, 8, at(8))).toBe(false); // boundary: quiet ends at 8
  });
});
