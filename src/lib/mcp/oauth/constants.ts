export const MCP_RESOURCE_URL = "https://getmarketintelligence.in/api/mcp";
export const OAUTH_ISSUER = "https://getmarketintelligence.in";

export const OAUTH_PATHS = {
  authorize: "/api/mcp/oauth/authorize",
  token: "/api/mcp/oauth/token",
  register: "/api/mcp/oauth/register",
} as const;

export function oauthUrl(path: keyof typeof OAUTH_PATHS): string {
  return `${OAUTH_ISSUER}${OAUTH_PATHS[path]}`;
}

/** Claude web + variants; Claude Code loopback per RFC 8252. */
export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:" && u.hostname === "claude.ai" && u.pathname === "/api/mcp/auth_callback") {
      return true;
    }
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return u.pathname === "/callback" || u.pathname.endsWith("/callback");
    }
    return false;
  } catch {
    return false;
  }
}

export function redirectUriMatchesRegistered(requested: string, registered: string): boolean {
  if (requested === registered) return true;
  try {
    const a = new URL(requested);
    const b = new URL(registered);
    if (a.protocol !== b.protocol || a.hostname !== b.hostname || a.pathname !== b.pathname) return false;
    if (a.hostname === "localhost" || a.hostname === "127.0.0.1") return true;
    return a.port === b.port;
  } catch {
    return false;
  }
}
