import { NextResponse } from "next/server";
import { hasDatabase, sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ensureSmartSchema } from "@/lib/notify/smart/schema";

export const dynamic = "force-dynamic";

const ACTIONS = ["shown", "clicked", "dismissed"] as const;

/** POST /api/notifications/interactions {eventId, action} — learning signal for the relevance engine. */
export async function POST(req: Request) {
  const user = await getSessionUser().catch(() => null);
  if (!user || user.guest) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { eventId?: unknown; action?: unknown } | null;
  const eventId = Number(body?.eventId);
  const action = body?.action;
  if (!Number.isFinite(eventId) || !ACTIONS.includes(action as (typeof ACTIONS)[number])) {
    return NextResponse.json({ error: "eventId and action (shown|clicked|dismissed) required" }, { status: 400 });
  }
  await ensureSmartSchema();
  await sql()`INSERT INTO notification_interactions (user_email, event_id, action)
    VALUES (${user.email}, ${eventId}, ${action as string})`.catch(() => null);
  return NextResponse.json({ ok: true });
}
