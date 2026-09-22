import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public — the main app polls this for the latest published update banner. */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ update: null });
  await ensureSchema();
  const rows = await sql()`
    SELECT id, title, body, severity, created_at
    FROM app_updates
    WHERE published = true
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return NextResponse.json(
    { update: rows[0] ?? null },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
