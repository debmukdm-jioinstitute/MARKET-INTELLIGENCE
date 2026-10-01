import { describe, expect, it } from "vitest";
import {
  aggregateLexiconHeadlines,
  buildFallbackTldr,
  computeMultiPillarSentiment,
} from "@/lib/hf/news-intel-aggregate";
import type { LiveTickerItem } from "@/lib/macro/build-live-ticker";

describe("news-intel-aggregate", () => {
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

  it("computes negative market sentiment when domestic markets drop and crude surges", () => {
    const sampleTickerItems: LiveTickerItem[] = [
      {
        id: "nifty",
        label: "NIFTY 50",
        symbol: "^NSEI",
        price: 22421.95,
        changePct: -0.0088, // -0.88%
        prefix: "",
        suffix: "",
        decimals: 2,
        copyKey: "ticker_nifty",
        group: "india",
        source: { provider: "Yahoo", url: "" },
        live: true,
      },
      {
        id: "sensex",
        label: "SENSEX",
        symbol: "^BSESN",
        price: 71909.7,
        changePct: -0.0079, // -0.79%
        prefix: "",
        suffix: "",
        decimals: 2,
        copyKey: "ticker_sensex",
        group: "india",
        source: { provider: "Yahoo", url: "" },
        live: true,
      },
      {
        id: "vix_in",
        label: "INDIA VIX",
        symbol: "^INDIAVIX",
        price: 14.46,
        changePct: 0.0715, // +7.15%
        prefix: "",
        suffix: "",
        decimals: 2,
        copyKey: "ticker_vix_in",
        group: "vol",
        source: { provider: "Yahoo", url: "" },
        live: true,
      },
      {
        id: "nifty_auto",
        label: "NIFTY AUTO",
        symbol: "^CNXAUTO",
        price: 25384.95,
        changePct: -0.0346, // -3.46%
        prefix: "",
        suffix: "",
        decimals: 2,
        copyKey: "ticker_auto",
        group: "india",
        source: { provider: "Yahoo", url: "" },
        live: true,
      },
      {
        id: "brent",
        label: "BRENT",
        symbol: "BZ=F",
        price: 100.95,
        changePct: 0.0298, // +2.98%
        prefix: "$",
        suffix: "",
        decimals: 2,
        copyKey: "brent",
        group: "commodity",
        source: { provider: "Yahoo", url: "" },
        live: true,
      },
      {
        id: "usd_inr",
        label: "USD/INR",
        symbol: "INR=X",
        price: 96.31,
        changePct: 0.0051, // +0.51%
        prefix: "₹",
        suffix: "",
        decimals: 2,
        copyKey: "usd_inr",
        group: "fx",
        source: { provider: "Yahoo", url: "" },
        live: true,
      },
      {
        id: "ftse",
        label: "FTSE",
        symbol: "^FTSE",
        price: 10429,
        changePct: -0.0163, // -1.63%
        prefix: "",
        suffix: "",
        decimals: 2,
        copyKey: "ftse",
        group: "global",
        source: { provider: "Yahoo", url: "" },
        live: true,
      },
      {
        id: "nikkei",
        label: "NIKKEI",
        symbol: "^N225",
        price: 68956,
        changePct: 0.033, // +3.30%
        prefix: "",
        suffix: "",
        decimals: 2,
        copyKey: "nikkei",
        group: "global",
        source: { provider: "Yahoo", url: "" },
        live: true,
      },
    ];

    const result = computeMultiPillarSentiment({
      tickerItems: sampleTickerItems,
      breadth: { advances: 2206, declines: 7338, unchanged: 25, high52w: 78, low52w: 291, source: { provider: "NSE", url: "" } },
      newsSentiment: {
        score: 0,
        label: "neutral",
        confidence: 0.8,
        breakdown: { positive: 0, negative: 0, neutral: 1 },
        mode: "lexicon",
      },
      newsItems: [],
    });

    expect(result.label).toBe("negative");
    expect(result.score).toBeLessThan(-0.25);
    expect(result.confidence).toBeGreaterThan(0.75);
    expect(result.rationale).toMatch(/Bearish \/ Risk-Off/);
    expect(result.rationale).toMatch(/NIFTY 50 sliding/);
    expect(result.rationale).toMatch(/Brent Crude/);
    expect(result.disparityNote).toBeDefined();
    expect(result.pillars.domestic.label).toBe("negative");
    expect(result.pillars.commodity.label).toBe("negative");
    expect(result.drivers.negative.length).toBeGreaterThanOrEqual(3);
  });
});
