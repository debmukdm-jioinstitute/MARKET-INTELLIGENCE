import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

/** GET /api/admin/payments?status=&q= → revenue stats + Razorpay order list (admin only). */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ stats: null, orders: [] });

  await ensureSchema();
  const db = sql();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // paid | created | failed ...
  const q = searchParams.get("q")?.trim().toLowerCase();

  const agg = (await db`
    SELECT
      COALESCE(SUM(amount_paise) FILTER (WHERE status = 'paid'), 0)::bigint AS total_revenue_paise,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
      COALESCE(SUM(amount_paise) FILTER (WHERE status = 'paid' AND plan_id = 'pro_monthly' AND paid_at >= now() - INTERVAL '30 days'), 0)::bigint AS monthly_30d_paise,
      COALESCE(SUM(amount_paise) FILTER (WHERE status = 'paid' AND plan_id = 'pro_annual' AND paid_at >= now() - INTERVAL '365 days'), 0)::bigint AS annual_365d_paise
    FROM razorpay_orders
  `) as {
    total_revenue_paise: string;
    paid_count: number;
    monthly_30d_paise: string;
    annual_365d_paise: string;
  }[];
  const a = agg[0] ?? { total_revenue_paise: "0", paid_count: 0, monthly_30d_paise: "0", annual_365d_paise: "0" };

  const byPlan = (await db`
    SELECT plan_id,
           COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
           COALESCE(SUM(amount_paise) FILTER (WHERE status = 'paid'), 0)::bigint AS revenue_paise
    FROM razorpay_orders
    GROUP BY plan_id
    ORDER BY revenue_paise DESC
  `) as { plan_id: string; paid_count: number; revenue_paise: string }[];

  const rows = (await db`
    SELECT o.id, o.user_email, o.plan_id, o.amount_paise, o.status,
           o.payment_id, o.created_at, o.paid_at, u.name AS user_name
    FROM razorpay_orders o
    LEFT JOIN users u ON u.email = o.user_email
    WHERE (${status}::text IS NULL OR o.status = ${status}::text)
      AND (${q}::text IS NULL
           OR o.user_email ILIKE '%' || ${q}::text || '%'
           OR COALESCE(o.payment_id, '') ILIKE '%' || ${q}::text || '%'
           OR o.id ILIKE '%' || ${q}::text || '%')
    ORDER BY o.created_at DESC
    LIMIT 500
  `) as {
    id: string;
    user_email: string;
    plan_id: string;
    amount_paise: number;
    status: string;
    payment_id: string | null;
    created_at: Date | string;
    paid_at: Date | string | null;
    user_name: string | null;
  }[];

  const iso = (d: Date | string | null) => (d == null ? null : d instanceof Date ? d.toISOString() : d);
  const mrrEstimatePaise =
    Number(a.monthly_30d_paise) + Math.round(Number(a.annual_365d_paise) / 12);

  return NextResponse.json({
    stats: {
      totalRevenuePaise: Number(a.total_revenue_paise),
      totalRevenueInr: Number(a.total_revenue_paise) / 100,
      paidCount: a.paid_count,
      mrrEstimatePaise,
      mrrEstimateInr: mrrEstimatePaise / 100,
      byPlan: Object.fromEntries(
        byPlan.map((p) => [
          p.plan_id,
          { count: p.paid_count, revenuePaise: Number(p.revenue_paise), revenueInr: Number(p.revenue_paise) / 100 },
        ]),
      ),
    },
    orders: rows.map((r) => ({
      id: r.id,
      user_email: r.user_email,
      user_name: r.user_name,
      plan_id: r.plan_id,
      amount_paise: r.amount_paise,
      amount_inr: r.amount_paise / 100,
      status: r.status,
      payment_id: r.payment_id,
      created_at: iso(r.created_at),
      paid_at: iso(r.paid_at),
    })),
  });
}
