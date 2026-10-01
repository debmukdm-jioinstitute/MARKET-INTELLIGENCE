import type { SessionUser } from "@/lib/auth";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { buildCustomerId } from "@/lib/onboarding/build-form-model";
import { getProEntitlement, isProUser } from "@/lib/payments/pro-entitlement";

export type ProfileData = {
  name: string;
  email: string;
  role: "user" | "admin";
  customerId: string;
  memberSince: string | null;
  lastLoginAt: string | null;
  privacyAcceptedAt: string | null;
  signInMethod: "google" | "password" | "unknown";
  newsletterSubscribed: boolean;
  isPro: boolean;
  proPlan: string | null;
  proExpiresAt: string | null;
};

type Row = {
  created_at: Date | string | null;
  last_login_at: Date | string | null;
  privacy_accepted_at: Date | string | null;
  newsletter_opt_out: boolean | null;
  google: boolean | null;
};

const iso = (v: Date | string | null | undefined) => (v ? new Date(v).toISOString() : null);

/**
 * Derived live from the session plus the `users` row, so accounts created before this page existed work
 * with no migration or backfill. Missing values simply show as unknown.
 */
export async function loadProfile(user: SessionUser): Promise<ProfileData> {
  let row: Row | null = null;
  if (hasDatabase()) {
    try {
      await ensureSchema();
      const rows = (await sql()`
        SELECT created_at, last_login_at, privacy_accepted_at, newsletter_opt_out, (google_sub IS NOT NULL) AS google
        FROM users WHERE email = ${user.email}
      `) as unknown as Row[];
      row = rows[0] ?? null;
    } catch {
      row = null;
    }
  }
  const pro = await getProEntitlement(user.email);
  return {
    name: user.name,
    email: user.email,
    role: user.role === "admin" ? "admin" : "user",
    customerId: buildCustomerId(user.email, row?.created_at ?? null),
    memberSince: iso(row?.created_at),
    lastLoginAt: iso(row?.last_login_at),
    privacyAcceptedAt: iso(row?.privacy_accepted_at),
    signInMethod: row ? (row.google ? "google" : "password") : "unknown",
    newsletterSubscribed: row ? !row.newsletter_opt_out : true,
    isPro: isProUser(user, pro),
    proPlan: pro.planId,
    proExpiresAt: pro.expiresAt,
  };
}
