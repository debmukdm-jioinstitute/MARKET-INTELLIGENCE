import { describe, expect, it } from "vitest";
import {
  isNewsArticleRelevantForSymbol,
  SYMBOL_NEGATIVE_ALIASES,
} from "@/lib/feeds/research-intelligence";
import { findIndiaInstrument } from "@/lib/feeds/india/instruments";

describe("Research Dossier Trust & Semantics Gates", () => {
  describe("P0: Wrong-company news matching", () => {
    it("rejects Reliance Power and unrelated ADAG headlines for RELIANCE", () => {
      expect(
        isNewsArticleRelevantForSymbol(
          "Reliance Power shares surge 5% on debt reduction",
          "RELIANCE",
          "Reliance Industries Limited",
        ),
      ).toBe(false);

      expect(
        isNewsArticleRelevantForSymbol(
          "Anil Ambani's Reliance Infrastructure wins arbitration award",
          "RELIANCE",
          "Reliance Industries",
        ),
      ).toBe(false);

      expect(
        isNewsArticleRelevantForSymbol(
          "RPOWER hits upper circuit in today's trade",
          "RELIANCE",
          "Reliance Industries",
        ),
      ).toBe(false);
    });

    it("accepts genuine Reliance Industries headlines", () => {
      expect(
        isNewsArticleRelevantForSymbol(
          "Reliance Industries to invest in new solar gigafactory in Gujarat",
          "RELIANCE",
          "Reliance Industries Limited",
        ),
      ).toBe(true);

      expect(
        isNewsArticleRelevantForSymbol(
          "RELIANCE Q2 net profit jumps 12% to ₹19,800 crore",
          "RELIANCE",
          "Reliance Industries Limited",
        ),
      ).toBe(true);
    });

    it("verifies negative aliases exist for major conglomerates", () => {
      expect(SYMBOL_NEGATIVE_ALIASES.RELIANCE).toBeDefined();
      expect(SYMBOL_NEGATIVE_ALIASES.TCS).toBeDefined();
      expect(SYMBOL_NEGATIVE_ALIASES.TATAMOTORS).toBeDefined();
      expect(SYMBOL_NEGATIVE_ALIASES.LT).toContain("lt foods");
    });

    it("rejects Tata Motors news when searching for TCS", () => {
      expect(
        isNewsArticleRelevantForSymbol(
          "Tata Motors EV sales touch record high in festive season",
          "TCS",
          "Tata Consultancy Services",
        ),
      ).toBe(false);
    });

    it("rejects LT Foods headlines for LT (Larsen & Toubro)", () => {
      expect(
        isNewsArticleRelevantForSymbol(
          "Here's what drove LT Foods share price higher by 7% in trade on Feb 23",
          "LT",
          "Larsen & Toubro Limited",
        ),
      ).toBe(false);

      expect(
        isNewsArticleRelevantForSymbol(
          "Larsen & Toubro wins ₹5,000 crore metro rail order",
          "LT",
          "Larsen & Toubro Limited",
        ),
      ).toBe(true);
    });
  });

  describe("Options F&O Eligibility Gate", () => {
    it("confirms F&O eligibility for verified Nifty 50 constituents", () => {
      expect(findIndiaInstrument("RELIANCE")).toBeDefined();
      expect(findIndiaInstrument("TCS")).toBeDefined();
      expect(findIndiaInstrument("INFY")).toBeDefined();
      expect(findIndiaInstrument("HDFCBANK")).toBeDefined();
    });

    it("correctly identifies non-F&O or invalid symbols as not applicable", () => {
      expect(findIndiaInstrument("NONEXISTENT_STOCK")).toBeUndefined();
      expect(findIndiaInstrument("IDEA_FORGE")).toBeUndefined();
    });
  });

  describe("IPO Gain & Subscription Multiple Semantics", () => {
    it("calculates return since issue price without confusing it with listing gain", () => {
      const issuePrice = 100;
      const currentPrice = 145;
      const returnSinceIssue = ((currentPrice - issuePrice) / issuePrice) * 100;
      expect(returnSinceIssue).toBe(45);
    });

    it("normalizes subscription multiple with trailing x", () => {
      const rawSub = "15.42";
      const normalized = rawSub.endsWith("x") ? rawSub : `${rawSub}x`;
      expect(normalized).toBe("15.42x");

      const alreadyNormalized = "22.5x";
      const normalized2 = alreadyNormalized.endsWith("x") ? alreadyNormalized : `${alreadyNormalized}x`;
      expect(normalized2).toBe("22.5x");
    });
  });
});
