import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ tabs: [] });
  await ensureSchema();
  const db = sql();
  const tabs = await db`SELECT * FROM nav_tabs ORDER BY section, sort_order, label`;
  return NextResponse.json({ tabs });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  const href = String(body.href ?? "").trim();
  if (!label || !href) return NextResponse.json({ error: "Label and href are required" }, { status: 400 });

  await ensureSchema();
  const db = sql();
  const icon = String(body.icon ?? "Sparkles").trim() || "Sparkles";
  const section = String(body.section ?? "FEEDS").trim() || "FEEDS";
  const external = Boolean(body.external);
  const badge = body.badge ? String(body.badge).trim() : null;
  const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

  const [row] = await db`
    INSERT INTO nav_tabs (label, href, icon, section, external, badge, sort_order)
    VALUES (${label}, ${href}, ${icon}, ${section}, ${external}, ${badge}, ${sortOrder})
    RETURNING *
  `;
  return NextResponse.json({ tab: row });
}
