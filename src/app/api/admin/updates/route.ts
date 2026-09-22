import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ updates: [] });
  await ensureSchema();
  const updates = await sql()`SELECT * FROM app_updates ORDER BY created_at DESC`;
  return NextResponse.json({ updates });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!title || !text) return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  const severity = ["info", "warning", "critical"].includes(body.severity) ? body.severity : "info";

  await ensureSchema();
  const [row] = await sql()`
    INSERT INTO app_updates (title, body, severity)
    VALUES (${title}, ${text}, ${severity})
    RETURNING *
  `;
  return NextResponse.json({ update: row });
}
