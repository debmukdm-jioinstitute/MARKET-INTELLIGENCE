import { describe, expect, it } from "vitest";
import { marketCapFromQuoteSummary, marketCapFromYahooQuote } from "@/lib/feeds/sources/yahoo-market-cap";

describe("marketCapFromYahooQuote", () => {
  it("uses v7 marketCap when present", () => {
    expect(marketCapFromYahooQuote({ marketCap: 3e12 })).toBe(3e12);
  });

  it("rejects missing or non-positive caps", () => {
    expect(marketCapFromYahooQuote({})).toBeNull();
    expect(marketCapFromYahooQuote({ marketCap: 0 })).toBeNull();
  });
});

describe("marketCapFromQuoteSummary", () => {
  it("falls back to floatShares × price for Indian names with empty marketCap", () => {
    const cap = marketCapFromQuoteSummary({
      quoteSummary: {
        result: [
          {
            price: { regularMarketPrice: { raw: 1542.1 }, marketCap: {} },
            defaultKeyStatistics: { floatShares: { raw: 6_637_879_195 }, sharesOutstanding: {} },
          },
        ],
      },
    });
    expect(cap).toBeCloseTo(1542.1 * 6_637_879_195, 0);
  });

  it("prefers listed marketCap when Yahoo actually sends it", () => {
    const cap = marketCapFromQuoteSummary({
      quoteSummary: {
        result: [
          {
            price: { regularMarketPrice: { raw: 190 }, marketCap: { raw: 3e12 } },
            defaultKeyStatistics: { floatShares: { raw: 1 } },
          },
        ],
      },
    });
    expect(cap).toBe(3e12);
  });

  it("returns null on empty quoteSummary", () => {
    expect(marketCapFromQuoteSummary({ quoteSummary: { result: [] } })).toBeNull();
  });
});
