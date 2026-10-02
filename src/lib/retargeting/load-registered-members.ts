import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { isProEntitlementActive } from "@/lib/payments/pro-entitlement";
import { parseActivePlanId, type RazorpayPlanId } from "@/lib/payments/plans";
import { planLabel } from "@/lib/retargeting/audience";

export type RegisteredMember = {
  email: string;
  name: string | null;
  role: "user" | "admin";
  createdAt: string;
  currentPlanId: RazorpayPlanId | null;
  currentPlanLabel: string;
  entitlementActive: boolean;
  expiresAt: string | null;
  paidOrderCount: number;
  memberKind: "free" | "paid_active" | "paid_lapsed" | "admin";
};

export async function loadRegisteredMembers(): Promise<RegisteredMember[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const rows = (await sql()`
    SELECT
      u.email,
      u.name,
      u.role,
      u.created_at,
      u.pro_plan,
      u.pro_expires_at,
      COALESCE(p.paid_order_count, 0)::int AS paid_order_count
    FROM users u
    LEFT JOIN (
      SELECT user_email, count(*) FILTER (WHERE status = 'paid')::int AS paid_order_count
      FROM razorpay_orders
      GROUP BY user_email
    ) p ON p.user_email = u.email
    ORDER BY u.created_at DESC
  `) as {
    email: string;
    name: string | null;
    role: "user" | "admin";
    created_at: Date | string;
    pro_plan: string | null;
    pro_expires_at: Date | string | null;
    paid_order_count: number;
  }[];

  return rows.map((row) => {
    const currentPlanId = parseActivePlanId(row.pro_plan);
    const expiresAt = row.pro_expires_at ? new Date(row.pro_expires_at) : null;
    const entitlementActive = isProEntitlementActive(expiresAt);
    let memberKind: RegisteredMember["memberKind"] = "free";
    if (row.role === "admin") memberKind = "admin";
    else if (entitlementActive) memberKind = "paid_active";
    else if (row.paid_order_count > 0 || currentPlanId) memberKind = "paid_lapsed";

    return {
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: new Date(row.created_at).toISOString(),
      currentPlanId,
      currentPlanLabel: planLabel(currentPlanId),
      entitlementActive,
      expiresAt: expiresAt?.toISOString() ?? null,
      paidOrderCount: row.paid_order_count,
      memberKind,
    };
  });
}
