import { NextResponse } from "next/server";
import { hasDatabase, sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ensureSmartSchema } from "@/lib/notify/smart/schema";

export const dynamic = "force-dynamic";

const FREQUENCIES = ["all", "important", "digest"] as const;

async function requireUser() {
  const user = await getSessionUser().catch(() => null);
  return user && !user.guest ? user : null;
}

/** GET /api/notifications/smart-prefs → the caller's notification preferences. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database" }, { status: 503 });
  await ensureSmartSchema();
  const rows = (await sql()`SELECT frequency, muted_categories, quiet_start, quiet_end, max_push_per_day
    FROM notification_prefs WHERE user_email = ${user.email}`) as Record<string, unknown>[];
  return NextResponse.json({
    prefs: rows[0] ?? {
      frequency: "important", muted_categories: [], quiet_start: 22, quiet_end: 8, max_push_per_day: 3,
    },
  });
}

/** PUT /api/notifications/smart-prefs {frequency?, muted_categories?, quiet_start?, quiet_end?, max_push_per_day?} */
export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const frequency = FREQUENCIES.includes(body.frequency as (typeof FREQUENCIES)[number]) ? (body.frequency as string) : "important";
  const muted = Array.isArray(body.muted_categories) ? body.muted_categories.filter((c): c is string => typeof c === "string").slice(0, 20) : [];
  const qs = Math.min(23, Math.max(0, Number(body.quiet_start ?? 22) || 0));
  const qe = Math.min(23, Math.max(0, Number(body.quiet_end ?? 8) || 0));
  const maxPush = Math.min(10, Math.max(0, Math.floor(Number(body.max_push_per_day ?? 3) || 0)));

  await ensureSmartSchema();
  await sql()`
    INSERT INTO notification_prefs (user_email, frequency, muted_categories, quiet_start, quiet_end, max_push_per_day, updated_at)
    VALUES (${user.email}, ${frequency}, ${muted}, ${qs}, ${qe}, ${maxPush}, now())
    ON CONFLICT (user_email) DO UPDATE SET
      frequency = EXCLUDED.frequency, muted_categories = EXCLUDED.muted_categories,
      quiet_start = EXCLUDED.quiet_start, quiet_end = EXCLUDED.quiet_end,
      max_push_per_day = EXCLUDED.max_push_per_day, updated_at = now()`;
  return NextResponse.json({ ok: true });
}
