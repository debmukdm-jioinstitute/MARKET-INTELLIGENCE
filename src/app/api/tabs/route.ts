import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public — the main app's sidebar reads enabled tabs from here on every load. */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ tabs: [] });
  await ensureSchema();
  const db = sql();
  const tabs = await db`
    SELECT id, label, href, icon, section, external, badge, sort_order
    FROM nav_tabs
    WHERE enabled = true
    ORDER BY section, sort_order, label
  `;
  return NextResponse.json(
    { tabs },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
