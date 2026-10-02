import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { levelFor } from "@/lib/gamification/catalog";

export const dynamic = "force-dynamic";

/** GET /api/admin/gamification/leaderboard → all users with their XP totals (admin only). */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ users: [] });

  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT u.email, u.name,
      COALESCE(SUM(x.points), 0)::int AS total,
      COUNT(x.id)::int AS events,
      MAX(x.created_at) AS last_event_at
    FROM users u
    LEFT JOIN xp_events x ON x.user_email = u.email
    WHERE u.role = 'user'
    GROUP BY u.email, u.name
    ORDER BY total DESC, u.email ASC
  `) as {
    email: string;
    name: string;
    total: number;
    events: number;
    last_event_at: Date | string | null;
  }[];

  return NextResponse.json({
    users: rows.map((r) => ({
      email: r.email,
      name: r.name,
      total: r.total,
      level: levelFor(r.total),
      events: r.events,
      last_event_at: r.last_event_at instanceof Date ? r.last_event_at.toISOString() : r.last_event_at,
    })),
  });
}
