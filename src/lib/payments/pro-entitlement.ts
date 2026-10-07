import { plusPlanGrantDays, type RazorpayPlanId } from "@/lib/payments/plans";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export type ProEntitlement = {
  active: boolean;
  planId: RazorpayPlanId | null;
  expiresAt: string | null;
};

const DAY_MS = 86_400_000;

const HOUR_MS = 3_600_000;

export function proDurationDays(planId: RazorpayPlanId, at = new Date()): number {
  if (planId === "pro_annual") return 365;
  if (planId === "day_pass") return 1;
  return plusPlanGrantDays(at);
}

export function computeProExpiry(from: Date, planId: RazorpayPlanId): Date {
  if (planId === "day_pass") {
    return new Date(from.getTime() + 24 * HOUR_MS);
  }
  return new Date(from.getTime() + proDurationDays(planId, from) * DAY_MS);
}

export function isProEntitlementActive(expiresAt: string | Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  const t = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isFinite(t) && t > now.getTime();
}

/** Admins always Pro; guests never. */
export function isProUser(user: SessionUser | null | undefined, entitlement: ProEntitlement | null): boolean {
  if (!user || user.guest) return false;
  if (user.role === "admin") return true;
  return Boolean(entitlement?.active);
}

export async function getProEntitlement(email: string): Promise<ProEntitlement> {
  if (!hasDatabase()) {
    return { active: false, planId: null, expiresAt: null };
  }
  await ensureSchema();
  const rows = (await sql()`
    SELECT pro_plan, pro_expires_at FROM users WHERE email = ${email}
  `) as { pro_plan: string | null; pro_expires_at: Date | string | null }[];

  const row = rows[0];
  const planId = (row?.pro_plan as RazorpayPlanId | null) ?? null;
  const expiresAt = row?.pro_expires_at ? new Date(row.pro_expires_at).toISOString() : null;
  return {
    active: isProEntitlementActive(expiresAt),
    planId,
    expiresAt,
  };
}

export async function grantProSubscription(email: string, planId: RazorpayPlanId): Promise<ProEntitlement> {
  if (!hasDatabase()) {
    return { active: false, planId: null, expiresAt: null };
  }
  await ensureSchema();

  const rows = (await sql()`
    SELECT pro_expires_at FROM users WHERE email = ${email}
  `) as { pro_expires_at: Date | string | null }[];

  const existing = rows[0]?.pro_expires_at ? new Date(rows[0].pro_expires_at) : null;
  const now = new Date();
  let expires: Date;
  if (planId === "day_pass") {
    const dayEnd = computeProExpiry(now, planId);
    expires = existing && existing.getTime() > dayEnd.getTime() ? existing : dayEnd;
  } else {
    const base = existing && existing.getTime() > now.getTime() ? existing : now;
    expires = computeProExpiry(base, planId);
  }

  await sql()`
    UPDATE users
    SET pro_plan = ${planId}, pro_expires_at = ${expires.toISOString()}
    WHERE email = ${email}
  `;

  return {
    active: true,
    planId,
    expiresAt: expires.toISOString(),
  };
}

/**
 * Grant an explicit number of Plus days, stacking onto the later of now and
 * the current expiry. Unlike grantProSubscription this never applies the
 * launch-offer multiplier — used for XP redemptions and referral rewards,
 * which are always exactly N days.
 */
export async function grantProDays(
  email: string,
  days: number,
  planId: RazorpayPlanId = "pro_monthly",
): Promise<ProEntitlement> {
  if (!hasDatabase()) {
    return { active: false, planId: null, expiresAt: null };
  }
  await ensureSchema();

  const rows = (await sql()`
    SELECT pro_expires_at FROM users WHERE email = ${email}
  `) as { pro_expires_at: Date | string | null }[];

  const existing = rows[0]?.pro_expires_at ? new Date(rows[0].pro_expires_at) : null;
  const now = new Date();
  const base = existing && existing.getTime() > now.getTime() ? existing : now;
  const expires = new Date(base.getTime() + days * DAY_MS);

  await sql()`
    UPDATE users
    SET pro_plan = ${planId}, pro_expires_at = ${expires.toISOString()}
    WHERE email = ${email}
  `;

  return {
    active: true,
    planId,
    expiresAt: expires.toISOString(),
  };
}

export async function getRazorpayOrderMeta(
  orderId: string,
): Promise<{ planId: RazorpayPlanId | null; userEmail: string | null }> {
  if (!hasDatabase()) return { planId: null, userEmail: null };
  await ensureSchema();
  const rows = (await sql()`
    SELECT plan_id, user_email FROM razorpay_orders WHERE id = ${orderId} LIMIT 1
  `) as { plan_id: string; user_email: string }[];
  const row = rows[0];
  const raw = row?.plan_id;
  const planId =
    raw === "day_pass" || raw === "pro_monthly" || raw === "pro_annual" ? (raw as RazorpayPlanId) : null;
  return { planId, userEmail: row?.user_email ?? null };
}
