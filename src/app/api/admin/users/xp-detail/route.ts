import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { levelFor } from "@/lib/gamification/catalog";
import { getStreak } from "@/lib/gamification/engagement";

export const dynamic = "force-dynamic";

/** GET /api/admin/users/xp-detail?email= → full XP dossier for one user (admin only). */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  await ensureSchema();
  const db = sql();

  const users = (await db`
    SELECT email, name, role, created_at, last_login_at,
           pro_plan, pro_expires_at, referral_code, referred_by
    FROM users WHERE email = ${email} LIMIT 1
  `) as {
    email: string;
    name: string;
    role: string;
    created_at: Date | string;
    last_login_at: Date | string | null;
    pro_plan: string | null;
    pro_expires_at: Date | string | null;
    referral_code: string | null;
    referred_by: string | null;
  }[];
  if (users.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const user = users[0];

  const totals = (await db`
    SELECT COALESCE(SUM(points), 0)::int AS total, COUNT(*)::int AS events,
           MAX(created_at) AS last_event_at
    FROM xp_events WHERE user_email = ${email}
  `) as { total: number; events: number; last_event_at: Date | string | null }[];
  const t = totals[0] ?? { total: 0, events: 0, last_event_at: null };

  const byAction = (await db`
    SELECT action, COALESCE(SUM(points), 0)::int AS points, COUNT(*)::int AS events,
           MAX(created_at) AS last_at
    FROM xp_events WHERE user_email = ${email}
    GROUP BY action
    ORDER BY points DESC, action ASC
  `) as { action: string; points: number; events: number; last_at: Date | string | null }[];

  const recent = (await db`
    SELECT action, points, page, created_at
    FROM xp_events WHERE user_email = ${email}
    ORDER BY created_at DESC LIMIT 50
  `) as { action: string; points: number; page: string | null; created_at: Date | string }[];

  const engagement = (await db`
    SELECT day::text AS day, minutes
    FROM daily_engagement
    WHERE user_email = ${email} AND day >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY day ASC
  `) as { day: string; minutes: number }[];

  const streak = await getStreak(email).catch(() => ({ streak: 0, startDay: null as string | null }));

  const redemptions = byAction.filter((b) => b.points < 0);
  const referralEvents = byAction.filter((b) => b.action.startsWith("referral"));

  const made = (await db`
    SELECT referee_email, status, created_at, converted_at
    FROM referrals WHERE referrer_email = ${email}
    ORDER BY created_at DESC LIMIT 100
  `) as { referee_email: string; status: string; created_at: Date | string; converted_at: Date | string | null }[];

  const orders = (await db`
    SELECT id, plan_id, amount_paise, status, payment_id, created_at, paid_at
    FROM razorpay_orders WHERE user_email = ${email}
    ORDER BY created_at DESC LIMIT 50
  `) as {
    id: string;
    plan_id: string;
    amount_paise: number;
    status: string;
    payment_id: string | null;
    created_at: Date | string;
    paid_at: Date | string | null;
  }[];

  const iso = (d: Date | string | null) => (d == null ? null : d instanceof Date ? d.toISOString() : d);
  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: iso(user.created_at),
      last_login_at: iso(user.last_login_at),
      pro_plan: user.pro_plan,
      pro_expires_at: iso(user.pro_expires_at),
      referral_code: user.referral_code,
      referred_by: user.referred_by,
    },
    xp: {
      total: t.total,
      level: levelFor(t.total),
      events: t.events,
      last_event_at: iso(t.last_event_at),
      streak: streak.streak,
      streak_start: streak.startDay,
    },
    byAction: byAction.map((b) => ({ ...b, last_at: iso(b.last_at) })),
    recent: recent.map((e) => ({ ...e, created_at: iso(e.created_at) })),
    engagement,
    highlights: {
      redemptions: redemptions.map((b) => ({ ...b, last_at: iso(b.last_at) })),
      referralEvents: referralEvents.map((b) => ({ ...b, last_at: iso(b.last_at) })),
    },
    referralsMade: made.map((r) => ({ ...r, created_at: iso(r.created_at), converted_at: iso(r.converted_at) })),
    orders: orders.map((o) => ({ ...o, created_at: iso(o.created_at), paid_at: iso(o.paid_at) })),
  });
}
