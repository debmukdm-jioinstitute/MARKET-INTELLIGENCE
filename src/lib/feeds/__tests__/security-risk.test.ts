import { describe, expect, it } from "vitest";
import { shouldUseIndiaYahooChart } from "@/lib/feeds/security-risk";

describe("shouldUseIndiaYahooChart", () => {
  it("treats Nifty 500 symbols like TMCV as India even when US ticker regex matches", () => {
    expect(shouldUseIndiaYahooChart("TMCV", null)).toBe(true);
    expect(shouldUseIndiaYahooChart("tmcv", { market: "IN" })).toBe(true);
  });

  it("respects explicit US resolution", () => {
    expect(shouldUseIndiaYahooChart("AAPL", { market: "US" })).toBe(false);
  });

  it("honours .NS suffix", () => {
    expect(shouldUseIndiaYahooChart("RELIANCE.NS", null)).toBe(true);
  });
});
