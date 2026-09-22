import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { hasPushConfigured, sendPush } from "@/lib/admin/push";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ notifications: [], subscriberCount: 0, pushConfigured: hasPushConfigured() });

  await ensureSchema();
  const db = sql();
  const [notifications, subs] = await Promise.all([
    db`SELECT * FROM notifications_sent ORDER BY created_at DESC LIMIT 50`,
    db`SELECT count(*)::int AS n FROM push_subscriptions`,
  ]);
  return NextResponse.json({ notifications, subscriberCount: subs[0].n, pushConfigured: hasPushConfigured() });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  if (!hasPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as environment variables." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const url = body.url ? String(body.url).trim() : undefined;
  if (!title || !text) return NextResponse.json({ error: "Title and body are required" }, { status: 400 });

  await ensureSchema();
  const db = sql();
  const subs = (await db`SELECT endpoint, p256dh, auth FROM push_subscriptions`) as { endpoint: string; p256dh: string; auth: string }[];

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendPush(sub, { title, body: text, url });
      if (result.ok) sent += 1;
      else {
        failed += 1;
        if (result.expired) expired.push(sub.endpoint);
      }
    }),
  );
  if (expired.length) {
    await db`DELETE FROM push_subscriptions WHERE endpoint = ANY(${expired})`;
  }

  const [row] = await db`
    INSERT INTO notifications_sent (title, body, url, recipient_count, failure_count)
    VALUES (${title}, ${text}, ${url ?? null}, ${sent}, ${failed})
    RETURNING *
  `;
  return NextResponse.json({ notification: row });
}
