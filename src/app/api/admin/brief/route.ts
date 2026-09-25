import { requireAdmin } from "@/lib/admin/guard";
import { ensureBriefSchema } from "@/lib/brief/store";
import { hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const noDb = () => NextResponse.json({ error: "No database configured" }, { status: 503 });

/** Brief subscribers + recent generated briefs. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return noDb();
  await ensureBriefSchema();
  const db = sql();
  const [subscribers, briefs] = await Promise.all([
    db`SELECT email, pre, post, created_at FROM brief_subscriptions ORDER BY created_at DESC LIMIT 500`,
    db`SELECT id, kind, engine, generated_at, emailed_at, jsonb_array_length(COALESCE(payload->'items', '[]'::jsonb))::int AS items FROM daily_briefs ORDER BY generated_at DESC LIMIT 20`,
  ]);
  return NextResponse.json({
    subscribers,
    briefs,
    totals: {
      subscribers: subscribers.length,
      pre: subscribers.filter((s) => s.pre).length,
      post: subscribers.filter((s) => s.post).length,
    },
  });
}

/** PATCH {email, pre?, post?} updates a subscription. */
export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return noDb();
  const b = (await req.json().catch(() => ({}))) as { email?: string; pre?: boolean; post?: boolean };
  if (typeof b.email !== "string" || (typeof b.pre !== "boolean" && typeof b.post !== "boolean")) return NextResponse.json({ error: "email and pre/post required" }, { status: 400 });
  await ensureBriefSchema();
  const db = sql();
  if (typeof b.pre === "boolean") await db`UPDATE brief_subscriptions SET pre = ${b.pre} WHERE email = ${b.email}`;
  if (typeof b.post === "boolean") await db`UPDATE brief_subscriptions SET post = ${b.post} WHERE email = ${b.email}`;
  return NextResponse.json({ ok: true });
}

/** DELETE ?email= removes a subscriber. */
export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return noDb();
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  await ensureBriefSchema();
  await sql()`DELETE FROM brief_subscriptions WHERE email = ${email}`;
  return NextResponse.json({ ok: true });
}
