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
  if (typeof body.published === "boolean") {
    await sql()`UPDATE app_updates SET published = ${body.published} WHERE id = ${id}`;
  }
  const [row] = await sql()`SELECT * FROM app_updates WHERE id = ${id}`;
  return NextResponse.json({ update: row ?? null });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const { id } = await ctx.params;
  await ensureSchema();
  await sql()`DELETE FROM app_updates WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
