import type { RazorpayPlanId } from "@/lib/payments/plans";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export type ProEntitlement = {
  active: boolean;
  planId: RazorpayPlanId | null;
  expiresAt: string | null;
};

const DAY_MS = 86_400_000;

export function proDurationDays(planId: RazorpayPlanId): number {
  return planId === "pro_annual" ? 365 : 30;
}

export function computeProExpiry(from: Date, planId: RazorpayPlanId): Date {
  return new Date(from.getTime() + proDurationDays(planId) * DAY_MS);
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
  const base = existing && existing.getTime() > now.getTime() ? existing : now;
  const expires = computeProExpiry(base, planId);

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
  const planId = raw === "pro_monthly" || raw === "pro_annual" ? raw : null;
  return { planId, userEmail: row?.user_email ?? null };
}
