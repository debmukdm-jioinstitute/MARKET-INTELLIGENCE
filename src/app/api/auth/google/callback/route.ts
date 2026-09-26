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

function authErrorRedirect(req: Request, code: string, path: "/login" | "/signup" = "/login") {
  const url = new URL(path, req.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  if (!hasDatabase()) {
    return authErrorRedirect(req, "accounts_unavailable");
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return authErrorRedirect(req, "google_not_configured");
  }

  const { searchParams } = new URL(req.url);
  const err = searchParams.get("error");
  if (err) {
    return authErrorRedirect(req, err === "access_denied" ? "google_denied" : "google_failed");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return authErrorRedirect(req, "google_missing_code");
  }

  const store = await cookies();
  const raw = store.get("mi_google_oauth")?.value;
  const pending = raw
    ? verifySessionToken<{ state?: string; next?: string; exp?: number; privacyAccepted?: boolean }>(raw)
    : null;
  if (!pending?.state || pending.state !== state || !pending.exp || pending.exp < Date.now()) {
    return authErrorRedirect(req, "google_state_invalid");
  }

  const next = sanitizeAuthNext(pending.next);

  try {
    const { accessToken } = await exchangeGoogleCode(config, code);
    const profile = await fetchGoogleUserInfo(accessToken);
    const res = await sessionResponseForGoogleUser(profile, next, req.url, {
      privacyAccepted: pending.privacyAccepted === true,
    });
    res.cookies.set("mi_google_oauth", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    return authErrorRedirect(req, "google_failed");
  }
}
