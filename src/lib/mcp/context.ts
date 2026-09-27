import type { SessionUser } from "@/lib/auth";
import { verifySessionToken } from "@/lib/auth-crypto";
import { createHash, timingSafeEqual } from "crypto";

export type McpAccess = "public" | "user" | "admin" | "auth";

export type McpCallContext = {
  user: SessionUser | null;
  /** Set when the caller presented a valid MCP API key. */
  apiKey: string | null;
};

const digest = (s: string) => createHash("sha256").update(s).digest();

function mcpApiKeys(): string[] {
  return (process.env.MCP_API_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
}

export function isMcpApiKey(token: string): boolean {
  const keys = mcpApiKeys();
  if (!keys.length || !token) return false;
  const p = digest(token);
  return keys.some((k) => timingSafeEqual(p, digest(k)));
}

/** Session token from `mi_sign_in` or the browser `mi_session` cookie value. */
export function sessionFromToken(token: string | null | undefined): SessionUser | null {
  if (!token?.includes(".")) return null;
  const session = verifySessionToken<SessionUser>(token);
  if (!session?.email || session.guest) return null;
  return {
    email: session.email.trim().toLowerCase(),
    name: session.name ?? "Investor",
    guest: false,
    role: session.role === "admin" ? "admin" : "user",
  };
}

export function resolveMcpCallContext(req: Request): McpCallContext {
  const xKey = req.headers.get("x-api-key")?.trim() ?? "";
  const xSession = req.headers.get("x-mi-session")?.trim() ?? "";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";

  let apiKey: string | null = null;
  let sessionToken = xSession;

  if (xKey && isMcpApiKey(xKey)) apiKey = xKey;
  if (bearer) {
    if (isMcpApiKey(bearer)) apiKey = bearer;
    else if (!sessionToken) sessionToken = bearer;
  }

  const user = sessionFromToken(sessionToken);
  return { user, apiKey };
}

export function authErrorForTool(access: McpAccess, ctx: McpCallContext): string | null {
  if (access === "auth") return null;
  if (access === "public") {
    if (!mcpApiKeys().length) return "MCP tool calls disabled: MCP_API_KEYS not configured on server.";
    if (!ctx.apiKey) return "Unauthorized: valid API key required (X-API-Key or Authorization: Bearer <key>).";
    return null;
  }
  if (access === "user") {
    if (!ctx.user) return "Sign in required: call mi_sign_in, then send the session token via X-MI-Session or Authorization: Bearer <token>.";
    return null;
  }
  if (access === "admin") {
    if (!ctx.user) return "Admin sign-in required.";
    if (ctx.user.role !== "admin") return "Admin role required.";
    return null;
  }
  return null;
}
