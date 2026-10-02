import { describe, expect, it } from "vitest";
import { mcpPaidAccessErrorSync } from "@/lib/mcp/paid-access";
import type { McpCallContext } from "@/lib/mcp/context";
import type { SessionUser } from "@/lib/auth";

const baseCtx: McpCallContext = { user: null, apiKey: null, oauthAccess: false };
const user: SessionUser = { email: "a@b.com", name: "A", guest: false, role: "user" };

describe("mcpPaidAccessErrorSync", () => {
  it("allows MCP_API_KEY", () => {
    expect(mcpPaidAccessErrorSync({ ...baseCtx, apiKey: "k" }, null, false)).toBeNull();
  });

  it("blocks anonymous", () => {
    expect(mcpPaidAccessErrorSync(baseCtx, null, false)).toMatch(/paid plan/i);
  });

  it("blocks free signed-in user", () => {
    expect(mcpPaidAccessErrorSync({ ...baseCtx, user }, user, false)).toMatch(/paid plan/i);
  });

  it("allows paid user", () => {
    expect(mcpPaidAccessErrorSync({ ...baseCtx, user }, user, true)).toBeNull();
  });

  it("allows admin without entitlement", () => {
    const admin = { ...user, role: "admin" as const };
    expect(mcpPaidAccessErrorSync({ ...baseCtx, user: admin }, admin, false)).toBeNull();
  });
});
