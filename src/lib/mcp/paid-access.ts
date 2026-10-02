import type { SessionUser } from "@/lib/auth";
import type { McpCallContext } from "@/lib/mcp/context";
import { getProEntitlement, isProUser } from "@/lib/payments/pro-entitlement";

export const MCP_PRICING_URL = "https://getmarketintelligence.in/pricing";
export const MCP_LOGIN_URL = "https://getmarketintelligence.in/login";

export const MCP_PAID_PLANS_COPY =
  "Claude MCP (Claude Desktop, claude.ai, Cursor, Claude Code) is included on every paid plan: Daily pass, Plus plan, and Pro plan.";

export const MCP_PAID_REQUIRED_MESSAGE = `${MCP_PAID_PLANS_COPY} Upgrade at ${MCP_PRICING_URL}`;

/** Owner automation keys bypass billing. */
export function mcpPaidAccessErrorSync(ctx: McpCallContext, user: SessionUser | null, entitlementActive: boolean): string | null {
  if (ctx.apiKey) return null;
  if (!user) {
    return `${MCP_PAID_REQUIRED_MESSAGE} Sign in on the website, subscribe, then connect Claude again.`;
  }
  if (user.role === "admin") return null;
  if (entitlementActive) return null;
  return MCP_PAID_REQUIRED_MESSAGE;
}

export async function mcpPaidAccessError(ctx: McpCallContext): Promise<string | null> {
  if (ctx.apiKey) return null;
  const user = ctx.user;
  if (!user) {
    return `${MCP_PAID_REQUIRED_MESSAGE} Sign in on the website, subscribe, then connect Claude again.`;
  }
  if (user.role === "admin") return null;
  const ent = await getProEntitlement(user.email);
  return mcpPaidAccessErrorSync(ctx, user, isProUser(user, ent));
}
