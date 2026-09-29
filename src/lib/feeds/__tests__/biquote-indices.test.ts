import { describe, expect, it } from "vitest";
import { INDIA_BENCHMARK_DEFS, INDIA_BENCHMARK_YAHOO_SYMBOLS } from "@/lib/feeds/india/indices";

describe("INDIA_BENCHMARK_DEFS", () => {
  it("lists many index tickers, no single-stock symbols", () => {
    expect(INDIA_BENCHMARK_DEFS.length).toBeGreaterThanOrEqual(28);
    for (const d of INDIA_BENCHMARK_DEFS) {
      expect(d.yahoo).not.toMatch(/^RELIANCE|^HDFCBANK|^INFY$/);
      if (d.yahoo.endsWith(".NS")) {
        expect(d.yahoo).toMatch(/NIFTY|BSE|INDEX|MID|SENSEX/i);
      }
    }
  });

  it("yahoo symbol list matches defs", () => {
    expect(INDIA_BENCHMARK_YAHOO_SYMBOLS.length).toBe(INDIA_BENCHMARK_DEFS.length);
  });
});
