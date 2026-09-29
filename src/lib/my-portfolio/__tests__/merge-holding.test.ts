import { describe, expect, it } from "vitest";
import {
  consolidateHoldings,
  mergeAvgCost,
  mergeHoldingIntoList,
} from "@/lib/my-portfolio/merge-holding";
import type { Holding } from "@/lib/my-portfolio/types";

const base = (over: Partial<Holding> & Pick<Holding, "symbol">): Holding => ({
  id: over.id ?? "h-1",
  market: over.market ?? "IN",
  symbol: over.symbol,
  instrumentKey: null,
  name: over.name ?? "Test",
  sector: null,
  currency: "INR",
  shares: over.shares ?? 10,
  avgCost: over.avgCost ?? 100,
  addedAt: over.addedAt ?? "2026-01-01",
});

describe("mergeAvgCost", () => {
  it("weights by share count", () => {
    expect(mergeAvgCost(10, 100, 10, 200)).toBe(150);
    expect(mergeAvgCost(3, 50, 1, 150)).toBeCloseTo(75);
  });
});

describe("mergeHoldingIntoList", () => {
  it("appends when symbol is new", () => {
    const book = [base({ symbol: "RELIANCE", shares: 5 })];
    const incoming = base({ id: "h-2", symbol: "INFY", shares: 2, avgCost: 800 });
    const { list, merged, result } = mergeHoldingIntoList(book, incoming);
    expect(merged).toBe(false);
    expect(list).toHaveLength(2);
    expect(result.symbol).toBe("INFY");
  });

  it("merges same market+symbol with weighted average", () => {
    const book = [base({ id: "keep", symbol: "ADANIPORTS", shares: 10, avgCost: 100, addedAt: "2026-01-01" })];
    const incoming = base({
      id: "drop",
      symbol: "ADANIPORTS",
      shares: 10,
      avgCost: 200,
      addedAt: "2026-02-01",
    });
    const { list, merged, result } = mergeHoldingIntoList(book, incoming);
    expect(merged).toBe(true);
    expect(list).toHaveLength(1);
    expect(result.id).toBe("keep");
    expect(result.shares).toBe(20);
    expect(result.avgCost).toBe(150);
    expect(result.addedAt).toBe("2026-01-01");
  });
});

describe("consolidateHoldings", () => {
  it("folds multiple duplicate rows", () => {
    const messy = [
      base({ id: "a", symbol: "TCS", shares: 5, avgCost: 100 }),
      base({ id: "b", symbol: "TCS", shares: 5, avgCost: 300 }),
    ];
    const clean = consolidateHoldings(messy);
    expect(clean).toHaveLength(1);
    expect(clean[0]!.shares).toBe(10);
    expect(clean[0]!.avgCost).toBe(200);
  });
});
