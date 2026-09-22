import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ customers: [] });

  await ensureSchema();
  const db = sql();
  const customers = await db`
    SELECT email, name, role, created_at, last_login_at
    FROM users
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ customers });
}
