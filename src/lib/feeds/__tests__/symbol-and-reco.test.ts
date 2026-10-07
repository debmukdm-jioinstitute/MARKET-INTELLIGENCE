import { describe, expect, it } from "vitest";
import { scoreHit, type SymbolSearchHit } from "@/lib/feeds/symbol-search";
import { aliasSymbol, compactToken, normalizeSymbolQuery } from "@/lib/feeds/symbol-normalize";
import { parseRecommendation } from "@/lib/research/parse-recommendation";

const jpPower: SymbolSearchHit = {
  symbol: "JPPOWER",
  name: "Jaiprakash Power Ventures Limited",
  market: "IN",
  exchange: "NSE",
};

const reliance: SymbolSearchHit = {
  symbol: "RELIANCE",
  name: "Reliance Industries Limited",
  market: "IN",
  exchange: "NSE",
};

describe("symbol normalize", () => {
  it("compacts spaced queries like JP Power", () => {
    expect(compactToken("JP Power")).toBe("JPPOWER");
    expect(normalizeSymbolQuery("J.P. Power")).toBe("J P POWER");
    expect(aliasSymbol("JP Power")).toBe("JPPOWER");
  });
});

describe("scoreHit fuzzy matching", () => {
  it("matches JP Power to JPPOWER", () => {
    expect(scoreHit("JP Power", jpPower)).toBeGreaterThan(400);
    expect(scoreHit("JPPOWER", jpPower)).toBeGreaterThanOrEqual(1000);
    expect(scoreHit("jaiprakash power", jpPower)).toBeGreaterThan(200);
  });

  it("ranks a transposed-typo symbol above an unrelated name-token match", () => {
    const rcom: SymbolSearchHit = { symbol: "RCOM", name: "RELIANCE COMMUNICATIONS L", market: "IN", exchange: "NSE" };
    // "relaince" is 1 transposition from RELIANCE; RCOM only matches via a name token.
    expect(scoreHit("relaince", reliance)).toBeGreaterThan(scoreHit("relaince", rcom));
  });

  it("matches common aliases", () => {
    expect(scoreHit("RIL", reliance)).toBeGreaterThan(400);
    expect(scoreHit("reliance industries", reliance)).toBeGreaterThan(400);
  });
});

describe("parseRecommendation", () => {
  it("extracts rating, target, basis and default horizon", () => {
    const parsed = parseRecommendation(
      "Buy Reliance Industries; target of Rs 3,200: Motilal Oswal",
      "Broker cites valuation and earnings growth in the upgrade note.",
    );
    expect(parsed.rating).toBe("buy");
    expect(parsed.targetPrice).toBe(3200);
    expect(parsed.companyHint?.toLowerCase()).toContain("reliance");
    expect(parsed.horizon).toBeTruthy();
    expect(parsed.horizonDays).toBeGreaterThan(0);
    expect(parsed.basis).toMatch(/Valuation|Earnings|Headline/i);
  });

  it("parses explicit multi-month horizon", () => {
    const parsed = parseRecommendation("Hold HDFC Bank for 6 months target Rs 1800: Kotak");
    expect(parsed.rating).toBe("hold");
    expect(parsed.horizonDays).toBe(180);
    expect(parsed.targetPrice).toBe(1800);
  });
});
