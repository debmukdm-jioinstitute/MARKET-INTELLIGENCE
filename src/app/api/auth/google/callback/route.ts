import { sessionResponseForGoogleUser } from "@/lib/auth/google-user";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  getGoogleOAuthConfig,
  sanitizeAuthNext,
} from "@/lib/auth/google-oauth";
import { verifySessionToken } from "@/lib/auth-crypto";
import { hasDatabase } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function loginErrorRedirect(req: Request, code: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  if (!hasDatabase()) {
    return loginErrorRedirect(req, "accounts_unavailable");
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return loginErrorRedirect(req, "google_not_configured");
  }

  const { searchParams } = new URL(req.url);
  const err = searchParams.get("error");
  if (err) {
    return loginErrorRedirect(req, err === "access_denied" ? "google_denied" : "google_failed");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return loginErrorRedirect(req, "google_missing_code");
  }

  const store = await cookies();
  const raw = store.get("mi_google_oauth")?.value;
  const pending = raw
    ? verifySessionToken<{ state?: string; next?: string; exp?: number }>(raw)
    : null;
  if (!pending?.state || pending.state !== state || !pending.exp || pending.exp < Date.now()) {
    return loginErrorRedirect(req, "google_state_invalid");
  }

  const next = sanitizeAuthNext(pending.next);

  try {
    const { accessToken } = await exchangeGoogleCode(config, code);
    const profile = await fetchGoogleUserInfo(accessToken);
    const res = await sessionResponseForGoogleUser(profile, next, req.url);
    res.cookies.set("mi_google_oauth", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    return loginErrorRedirect(req, "google_failed");
  }
}
