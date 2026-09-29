import { describe, expect, it } from "vitest";
import { INDIA_BENCHMARK_YAHOO_SYMBOLS } from "@/lib/feeds/sources/biquote";

describe("INDIA_BENCHMARK_YAHOO_SYMBOLS", () => {
  it("contains only index tickers, not equities", () => {
    for (const sym of INDIA_BENCHMARK_YAHOO_SYMBOLS) {
      expect(sym.startsWith("^")).toBe(true);
      expect(sym).not.toMatch(/\.NS$/);
    }
  });
});
