import {
  buildGoogleAuthUrl,
  getGoogleOAuthConfig,
  newOAuthState,
  sanitizeAuthNext,
} from "@/lib/auth/google-oauth";
import { signSessionPayload } from "@/lib/auth-crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const config = getGoogleOAuthConfig();
  const loginUrl = new URL("/login", req.url);
  if (!config) {
    loginUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const { searchParams } = new URL(req.url);
  const next = sanitizeAuthNext(searchParams.get("next"));
  const state = newOAuthState();
  const oauthCookie = signSessionPayload({
    state,
    next,
    exp: Date.now() + 10 * 60 * 1000,
  });

  const res = NextResponse.redirect(buildGoogleAuthUrl(config, state));
  res.cookies.set("mi_google_oauth", oauthCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
