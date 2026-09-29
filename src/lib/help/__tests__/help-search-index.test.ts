import { describe, expect, it } from "vitest";
import { searchHelpTopics } from "@/lib/help/help-search-index";

describe("searchHelpTopics", () => {
  it("routes the task's own example question to the MCP topic", () => {
    const hits = searchHelpTopics("how to connect market intelligence mcp to claude");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.id).toBe("mcp");
    expect(hits[0]!.href).toBe("/help#mcp");
  });

  it("stays silent on an unrelated market query", () => {
    expect(searchHelpTopics("reliance industries quarterly results")).toEqual([]);
    expect(searchHelpTopics("nifty 50 pe ratio")).toEqual([]);
  });

  it("separates a Cursor question from a general MCP one via the mcp topic's own keywords", () => {
    const hits = searchHelpTopics("connect cursor to the mcp server");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.id).toBe("mcp");
  });
});
