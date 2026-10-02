import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { rowToRetargetingCustomer } from "@/lib/retargeting/audience";
import type { RetargetingCustomer, RetargetingCustomerRow } from "@/lib/retargeting/types";

export async function loadRetargetingAudience(): Promise<RetargetingCustomer[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const rows = (await sql()`
    SELECT
      u.email,
      u.name,
      u.pro_plan,
      u.pro_expires_at,
      COALESCE(p.paid_order_count, 0)::int AS paid_order_count,
      p.last_paid_at,
      p.plans_purchased
    FROM users u
    LEFT JOIN (
      SELECT
        user_email,
        count(*) FILTER (WHERE status = 'paid')::int AS paid_order_count,
        max(paid_at) AS last_paid_at,
        array_agg(DISTINCT plan_id) FILTER (WHERE status = 'paid') AS plans_purchased
      FROM razorpay_orders
      GROUP BY user_email
    ) p ON p.user_email = u.email
    WHERE u.role <> 'admin'
      AND (
        COALESCE(p.paid_order_count, 0) > 0
        OR u.pro_plan IS NOT NULL
      )
    ORDER BY p.last_paid_at DESC NULLS LAST, u.created_at DESC
  `) as RetargetingCustomerRow[];

  return rows.map(rowToRetargetingCustomer);
}
