import { isBootstrapAdmin } from "@/lib/admin/auth";
import { setSessionCookie } from "@/lib/admin/session-cookie";
import { ensureSchema, sql } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { googleOnlyPasswordPlaceholder, type GoogleUserInfo } from "@/lib/auth/google-oauth";
import { sendWelcomePackToUser } from "@/lib/onboarding/send-welcome-pack";
import { NextResponse } from "next/server";

type UserRow = {
  email: string;
  name: string;
  password_hash: string;
  role: "user" | "admin";
  google_sub: string | null;
};

/** Link or create a user from Google OIDC profile and attach session cookie. */
export async function sessionResponseForGoogleUser(
  profile: GoogleUserInfo,
  redirectTo: string,
  requestUrl: string,
  opts?: { privacyAccepted?: boolean },
): Promise<NextResponse> {
  await ensureSchema();
  const db = sql();
  const email = profile.email.trim().toLowerCase();
  const name = (profile.name?.trim() || email.split("@")[0] || "Investor").slice(0, 120);
  const sub = profile.sub;

  const byGoogle = await db`
    SELECT email, name, password_hash, role, google_sub FROM users WHERE google_sub = ${sub}
  `;
  let row = byGoogle[0] as UserRow | undefined;

  if (!row) {
    const byEmail = await db`
      SELECT email, name, password_hash, role, google_sub FROM users WHERE email = ${email}
    `;
    row = byEmail[0] as UserRow | undefined;

    if (row) {
      await db`
        UPDATE users SET google_sub = ${sub}, name = ${name}, last_login_at = now(),
          email_verified_at = coalesce(email_verified_at, now())
        WHERE email = ${email}
      `;
    } else {
      if (!opts?.privacyAccepted) {
        const url = new URL("/signup", requestUrl);
        url.searchParams.set("error", "privacy_required");
        url.searchParams.set("next", redirectTo);
        return NextResponse.redirect(url);
      }
      const role = isBootstrapAdmin(email) ? "admin" : "user";
      const passwordHash = googleOnlyPasswordPlaceholder(sub);
      await db`
        INSERT INTO users (email, name, password_hash, role, google_sub, last_login_at, privacy_accepted_at, email_verified_at)
        VALUES (${email}, ${name}, ${passwordHash}, ${role}, ${sub}, now(), now(), now())
      `;
      row = { email, name, password_hash: passwordHash, role, google_sub: sub };
      const sessionUser = { email, name, role: role as "admin" | "user", guest: false as const };
      void sendWelcomePackToUser(sessionUser, new URL(requestUrl).origin).catch((err) => {
        console.error("[welcome-pack]", email, err);
      });
      const onboard = new URL("/onboarding", requestUrl);
      onboard.searchParams.set("next", redirectTo);
      onboard.searchParams.set("download", "1");
      const res = NextResponse.redirect(onboard);
      return setSessionCookie(res, sessionUser);
    }
  } else {
    await db`UPDATE users SET name = ${name}, last_login_at = now() WHERE google_sub = ${sub}`;
  }

  const role = isBootstrapAdmin(email) ? "admin" : row.role;
  if (role !== row.role) {
    await db`UPDATE users SET role = ${role} WHERE email = ${email}`;
  }

  const user: SessionUser = { email, name, role, guest: false };
  const res = NextResponse.redirect(new URL(redirectTo, requestUrl));
  return setSessionCookie(res, user);
}
