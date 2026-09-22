import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  await ensureSchema();
  const db = sql();

  if (typeof body.enabled === "boolean") {
    await db`UPDATE nav_tabs SET enabled = ${body.enabled} WHERE id = ${id}`;
  }
  if (typeof body.sort_order === "number") {
    await db`UPDATE nav_tabs SET sort_order = ${body.sort_order} WHERE id = ${id}`;
  }
  if (typeof body.label === "string" && body.label.trim()) {
    await db`UPDATE nav_tabs SET label = ${body.label.trim()} WHERE id = ${id}`;
  }
  if (typeof body.href === "string" && body.href.trim()) {
    await db`UPDATE nav_tabs SET href = ${body.href.trim()} WHERE id = ${id}`;
  }

  const [row] = await db`SELECT * FROM nav_tabs WHERE id = ${id}`;
  return NextResponse.json({ tab: row ?? null });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const { id } = await ctx.params;
  await ensureSchema();
  await sql()`DELETE FROM nav_tabs WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
