import { describe, expect, it, vi } from "vitest";

// `unifiedSearch` fans out to `searchSymbols`, which on a cold cache fetches
// the real NSE instrument list over the network (see the timeout-budget
// comment in unified-search.ts — this is the exact hang that comment fixes).
// A unit test for help/question routing has no business depending on that
// network call succeeding or even completing; stub it so this test verifies
// the deterministic help-matching behavior only, deterministically and fast.
vi.mock("@/lib/feeds/symbol-search", () => ({
  searchSymbols: vi.fn(async () => []),
}));

const { unifiedSearch } = await import("@/lib/search/unified-search");

describe("unifiedSearch", () => {
  it("routes the task's own NL example to the MCP help topic, not zero results", async () => {
    const result = await unifiedSearch("how to connect market intelligence mcp to claude");
    expect(result.isQuestion).toBe(true);
    expect(result.help.length).toBeGreaterThan(0);
    expect(result.help[0]!.href).toBe("/help#mcp");
  });

  it("never dead-ends: an unrecognized question still offers the Ask Deb fallback", async () => {
    const result = await unifiedSearch("why did nifty fall today");
    expect(result.suggestAsk).toBe(true);
  });

  it("empty query returns the empty result, not an error", async () => {
    const result = await unifiedSearch("   ");
    expect(result.symbols).toEqual([]);
    expect(result.pages).toEqual([]);
    expect(result.help).toEqual([]);
    expect(result.suggestAsk).toBe(false);
  });
});
