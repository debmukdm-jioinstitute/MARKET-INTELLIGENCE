import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) {
    return NextResponse.json({ customers: 0, documents: 0, notificationsSent: 0, newslettersSent: 0, pageviews7d: 0, dbConfigured: false });
  }

  await ensureSchema();
  const db = sql();
  const [customers, documents, notifications, newsletters, pageviews] = await Promise.all([
    db`SELECT count(*)::int AS n FROM users`,
    db`SELECT count(*)::int AS n FROM rag_documents`,
    db`SELECT coalesce(sum(recipient_count), 0)::int AS n FROM notifications_sent`,
    db`SELECT count(*)::int AS n FROM newsletters WHERE status = 'sent'`,
    db`SELECT count(*)::int AS n FROM analytics_events WHERE created_at > now() - interval '7 days'`,
  ]);

  return NextResponse.json({
    customers: customers[0].n,
    documents: documents[0].n,
    notificationsSent: notifications[0].n,
    newslettersSent: newsletters[0].n,
    pageviews7d: pageviews[0].n,
    dbConfigured: true,
  });
}
