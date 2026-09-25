import { requireAdmin } from "@/lib/admin/guard";
import { ensureAlertSchema } from "@/lib/alerts/store";
import { hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const noDb = () => NextResponse.json({ error: "No database configured" }, { status: 503 });

/** Every user's alert rules + recent fired events. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return noDb();
  await ensureAlertSchema();
  const db = sql();
  const [rules, events] = await Promise.all([
    db`SELECT id, user_email, name, conditions, combinator, channels, cooldown_hours, active, last_fired_at, created_at FROM alert_rules ORDER BY created_at DESC LIMIT 500`,
    db`SELECT id, rule_id, user_email, fired_at, message, push_sent, email_sent FROM alert_events ORDER BY fired_at DESC LIMIT 50`,
  ]);
  return NextResponse.json({
    rules,
    events,
    totals: { rules: rules.length, active: rules.filter((r) => r.active).length, users: new Set(rules.map((r) => r.user_email)).size },
  });
}

/** PATCH {id, active} pauses/resumes any rule. */
export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return noDb();
  const b = (await req.json().catch(() => ({}))) as { id?: string; active?: boolean };
  if (typeof b.id !== "string" || typeof b.active !== "boolean") return NextResponse.json({ error: "id and active required" }, { status: 400 });
  await ensureAlertSchema();
  await sql()`UPDATE alert_rules SET active = ${b.active} WHERE id = ${b.id}::uuid`;
  return NextResponse.json({ ok: true });
}

/** DELETE ?id= removes any rule (and its event history). */
export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return noDb();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await ensureAlertSchema();
  const db = sql();
  await db`DELETE FROM alert_events WHERE rule_id = ${id}::uuid`;
  await db`DELETE FROM alert_rules WHERE id = ${id}::uuid`;
  return NextResponse.json({ ok: true });
}
