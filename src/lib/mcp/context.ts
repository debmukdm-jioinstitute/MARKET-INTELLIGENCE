import type { SessionUser } from "@/lib/auth";
import { verifySessionToken } from "@/lib/auth-crypto";
import { parseAccessToken } from "@/lib/mcp/oauth/crypto";
import { createHash, timingSafeEqual } from "crypto";

export type McpAccess = "public" | "user" | "admin" | "auth";

export type McpCallContext = {
  user: SessionUser | null;
  /** Set when the caller presented a valid MCP API key. */
  apiKey: string | null;
  /** Claude / MCP OAuth access token (public connector handshake). */
  oauthAccess: boolean;
  clientIp?: string;
};


const ipSessionMap = new Map<string, { user: SessionUser; exp: number }>();

export function rememberSessionForIp(ip: string, user: SessionUser) {
  if (!ip || ip === "anon" || ip === "unknown") return;
  if (ipSessionMap.size > 1000) {
    const now = Date.now();
    for (const [k, v] of ipSessionMap.entries()) {
      if (v.exp < now) ipSessionMap.delete(k);
    }
  }
  ipSessionMap.set(ip, { user, exp: Date.now() + 2 * 3600_000 });
}
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
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

  let apiKey: string | null = null;
  let sessionToken = xSession;
  let oauthAccess = false;
  let oauthUser: SessionUser | null = null;

  if (xKey && isMcpApiKey(xKey)) apiKey = xKey;
  if (bearer) {
    if (isMcpApiKey(bearer)) {
      apiKey = bearer;
    } else {
      const oauthRec = parseAccessToken(bearer);
      if (oauthRec) {
        oauthAccess = true;
        if (oauthRec.user) oauthUser = oauthRec.user;
      } else if (!sessionToken) {
        sessionToken = bearer;
      }
    }
  }

  let user = sessionFromToken(sessionToken) || oauthUser;
  if (!user && ip && ip !== "unknown") {
    const cached = ipSessionMap.get(ip);
    if (cached && cached.exp > Date.now()) {
      user = cached.user;
    }
  }

  return { user, apiKey, oauthAccess, clientIp: ip };
}

export function authErrorForTool(_access: McpAccess, _ctx: McpCallContext): string | null {
  if (_access === "auth") return null;
  if (_access === "public") {
    // Open read-only market data — rate-limited by IP in the MCP route (no customer API keys).
    return null;
  }
  if (_access === "user") {
    if (!_ctx.user) return "Sign in required: call mi_sign_in, then send the session token via X-MI-Session or Authorization: Bearer <token>.";
    return null;
  }
  if (_access === "admin") {
    if (!_ctx.user) return "Admin sign-in required.";
    if (_ctx.user.role !== "admin") return "Admin role required.";
    return null;
  }
  return null;
}
