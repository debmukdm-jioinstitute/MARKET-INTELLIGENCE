import { createHash } from "crypto";
import { signSessionPayload, verifySessionToken } from "@/lib/auth-crypto";
import type { SessionUser } from "@/lib/auth";

const CLIENT_PREFIX = "mcp_oauth_client:";
const CODE_PREFIX = "mcp_oauth_code:";
const ACCESS_PREFIX = "mcp_oauth_access:";
const REFRESH_PREFIX = "mcp_oauth_refresh:";

export type OAuthClientRecord = {
  kind: "client";
  redirectUris: string[];
  clientName?: string;
  iat: number;
};

export type OAuthCodeRecord = {
  kind: "code";
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  exp: number;
  user?: SessionUser;
};

export type OAuthAccessRecord = {
  kind: "access";
  clientId: string;
  scope: string;
  exp: number;
  user?: SessionUser;
};

export type OAuthRefreshRecord = {
  kind: "refresh";
  clientId: string;
  scope: string;
  exp: number;
  user?: SessionUser;
};

function wrap<T extends Record<string, unknown>>(prefix: string, payload: T): string {
  return `${prefix}${signSessionPayload(payload)}`;
}

function unwrap<T extends Record<string, unknown>>(prefix: string, token: string): T | null {
  if (!token.startsWith(prefix)) return null;
  return verifySessionToken<T>(token.slice(prefix.length));
}

export function issueClientId(record: Omit<OAuthClientRecord, "kind">): string {
  return wrap(CLIENT_PREFIX, { kind: "client", ...record });
}

export function parseClientId(clientId: string): OAuthClientRecord | null {
  const v = unwrap<OAuthClientRecord>(CLIENT_PREFIX, clientId);
  return v?.kind === "client" ? v : null;
}

export function issueAuthCode(record: Omit<OAuthCodeRecord, "kind">): string {
  return wrap(CODE_PREFIX, { kind: "code", ...record });
}

export function parseAuthCode(code: string): OAuthCodeRecord | null {
  const v = unwrap<OAuthCodeRecord>(CODE_PREFIX, code);
  if (v?.kind !== "code" || v.exp < Date.now()) return null;
  return v;
}

export function issueAccessToken(record: Omit<OAuthAccessRecord, "kind">): string {
  return wrap(ACCESS_PREFIX, { kind: "access", ...record });
}

export function parseAccessToken(token: string): OAuthAccessRecord | null {
  const v = unwrap<OAuthAccessRecord>(ACCESS_PREFIX, token);
  if (v?.kind !== "access" || v.exp < Date.now()) return null;
  return v;
}

export function issueRefreshToken(record: Omit<OAuthRefreshRecord, "kind">): string {
  return wrap(REFRESH_PREFIX, { kind: "refresh", ...record });
}

export function parseRefreshToken(token: string): OAuthRefreshRecord | null {
  const v = unwrap<OAuthRefreshRecord>(REFRESH_PREFIX, token);
  if (v?.kind !== "refresh" || v.exp < Date.now()) return null;
  return v;
}

export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const digest = createHash("sha256").update(codeVerifier).digest("base64url");
  return digest === codeChallenge;
}
