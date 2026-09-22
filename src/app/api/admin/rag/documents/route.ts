import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ documents: [] });
  await ensureSchema();
  const documents = await sql()`SELECT id, source, title, content, created_at FROM rag_documents ORDER BY created_at DESC`;
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) return NextResponse.json({ error: "Title and content are required" }, { status: 400 });

  await ensureSchema();
  const [row] = await sql()`
    INSERT INTO rag_documents (source, title, content)
    VALUES ('admin', ${title}, ${content})
    RETURNING id, source, title, content, created_at
  `;
  return NextResponse.json({ document: row });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ ok: true });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await ensureSchema();
  await sql()`DELETE FROM rag_documents WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
