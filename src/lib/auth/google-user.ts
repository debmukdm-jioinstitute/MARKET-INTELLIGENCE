import { isBootstrapAdmin } from "@/lib/admin/auth";
import { setSessionCookie } from "@/lib/admin/session-cookie";
import { ensureSchema, sql } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { googleOnlyPasswordPlaceholder, type GoogleUserInfo } from "@/lib/auth/google-oauth";
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
        UPDATE users SET google_sub = ${sub}, name = ${name}, last_login_at = now()
        WHERE email = ${email}
      `;
    } else {
      const role = isBootstrapAdmin(email) ? "admin" : "user";
      const passwordHash = googleOnlyPasswordPlaceholder(sub);
      await db`
        INSERT INTO users (email, name, password_hash, role, google_sub, last_login_at)
        VALUES (${email}, ${name}, ${passwordHash}, ${role}, ${sub}, now())
      `;
      row = { email, name, password_hash: passwordHash, role, google_sub: sub };
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
