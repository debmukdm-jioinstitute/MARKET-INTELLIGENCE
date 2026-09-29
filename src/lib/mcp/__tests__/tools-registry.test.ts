import { describe, expect, it } from "vitest";
import { TOOLS } from "@/lib/mcp/tools";

describe("MCP tool registry", () => {
  it("every tool has title and category for terminal menu", () => {
    const missing = TOOLS.filter((t) => !t.title?.trim() || !t.category?.trim());
    expect(missing.map((t) => t.name)).toEqual([]);
  });

  it("includes portfolio and alert mutations for signed-in users", () => {
    const names = new Set(TOOLS.map((t) => t.name));
    for (const n of [
      "add_holding",
      "create_alert",
      "get_my_watchlist",
      "parse_portfolio_statement",
      "list_portal_pages",
      "get_security_detail",
    ]) {
      expect(names.has(n), n).toBe(true);
    }
  });
});
