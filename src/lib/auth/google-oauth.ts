import crypto from "crypto";

export const GOOGLE_OAUTH_ONLY_PREFIX = "oauth:google-only:";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function googleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmarketintelligence.in").replace(/\/$/, "");
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || `${site}/api/auth/google/callback`;

  return { clientId, clientSecret, redirectUri };
}

export function sanitizeAuthNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/Home";
  return next.slice(0, 500);
}

export function newOAuthState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function googleOnlyPasswordPlaceholder(googleSub: string): string {
  return `${GOOGLE_OAUTH_ONLY_PREFIX}${googleSub}`;
}

export function isGoogleOnlyPasswordHash(stored: string): boolean {
  return stored.startsWith(GOOGLE_OAUTH_ONLY_PREFIX);
}

export function buildGoogleAuthUrl(config: GoogleOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  config: GoogleOAuthConfig,
  code: string,
): Promise<{ accessToken: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error ?? "Google token exchange failed");
  }
  return { accessToken: json.access_token };
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as GoogleUserInfo & { error?: string };
  if (!res.ok || !json.sub || !json.email) {
    throw new Error(json.error ?? "Could not read Google profile");
  }
  if (json.email_verified === false) {
    throw new Error("Google email is not verified");
  }
  return json;
}
