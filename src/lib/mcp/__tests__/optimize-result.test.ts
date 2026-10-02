import { describe, expect, it } from "vitest";
import {
  optimizeMcpPayload,
  getCachedMcpToolResult,
  setCachedMcpToolResult,
  isToolCacheable
} from "../optimize-result";

describe("MCP Result Optimizer", () => {
  it("compacts payloads by stripping null and undefined", () => {
    const raw = {
      name: "RELIANCE.NS",
      price: 1350.25,
      notes: null,
      internal: undefined,
      indicators: {
        rsi: 55.4,
        macd: null,
      },
      tags: ["energy", null, "nifty50"],
    };

    const optimized = optimizeMcpPayload(raw) as any;
    expect(optimized.notes).toBeUndefined();
    expect(optimized.internal).toBeUndefined();
    expect(optimized.indicators.macd).toBeUndefined();
    expect(optimized.indicators.rsi).toBe(55.4);
    expect(optimized.tags).toEqual(["energy", "nifty50"]);
  });

  it("rounds floating point precision to at most 4 decimal places", () => {
    const raw = {
      priceFloat: 12.300000000000002,
      spread: 0.000123456,
      integerVal: 5000,
    };

    const optimized = optimizeMcpPayload(raw) as any;
    expect(optimized.priceFloat).toBe(12.3);
    expect(optimized.spread).toBe(0.0001);
    expect(optimized.integerVal).toBe(5000);
  });

  it("caches idempotent public tools and retrieves within TTL", () => {
    const tool = "get_market_overview";
    const args = { market: "IN" };
    const mockData = { status: "ok", nifty: 24500 };

    expect(isToolCacheable(tool)).toBe(true);
    expect(isToolCacheable("mi_sign_in")).toBe(false);

    setCachedMcpToolResult(tool, args, mockData, 5000);
    const cached = getCachedMcpToolResult(tool, args);
    expect(cached).toEqual(mockData);
  });
});
