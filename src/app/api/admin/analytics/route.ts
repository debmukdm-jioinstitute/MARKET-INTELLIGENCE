import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ daily: [], topPaths: [], uniqueVisitors7d: 0 });

  await ensureSchema();
  const db = sql();
  const [daily, topPaths, uniques] = await Promise.all([
    db`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM analytics_events
      WHERE created_at > now() - interval '14 days'
      GROUP BY 1
      ORDER BY 1
    `,
    db`
      SELECT path, count(*)::int AS n
      FROM analytics_events
      WHERE created_at > now() - interval '7 days'
      GROUP BY path
      ORDER BY n DESC
      LIMIT 15
    `,
    db`
      SELECT count(DISTINCT user_email)::int AS n
      FROM analytics_events
      WHERE created_at > now() - interval '7 days' AND user_email IS NOT NULL
    `,
  ]);

  return NextResponse.json({ daily, topPaths, uniqueVisitors7d: uniques[0]?.n ?? 0 });
}
