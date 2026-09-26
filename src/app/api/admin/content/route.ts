import { requireAdmin } from "@/lib/admin/guard";
import { clearSiteContentCache } from "@/lib/site-content-cache";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getAdminUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ overrides: [] });

  await ensureSchema();
  const rows = await sql()`
    SELECT slot_key, value, updated_at, updated_by
    FROM site_content_overrides
    ORDER BY slot_key
  `;
  return NextResponse.json({ overrides: rows });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    slot_key?: string;
    value?: string;
    reset?: boolean;
    batch?: { slot_key: string; value: string }[];
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const user = await getAdminUser();
  const email = user?.email ?? "admin";

  await ensureSchema();
  const db = sql();

  if (body.batch?.length) {
    for (const row of body.batch) {
      if (!row.slot_key?.includes("::")) continue;
      if (!row.value.trim()) {
        await db`DELETE FROM site_content_overrides WHERE slot_key = ${row.slot_key}`;
      } else {
        await db`
          INSERT INTO site_content_overrides (slot_key, value, updated_by, updated_at)
          VALUES (${row.slot_key}, ${row.value}, ${email}, now())
          ON CONFLICT (slot_key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
        `;
      }
    }
    clearSiteContentCache();
    return NextResponse.json({ ok: true, count: body.batch.length });
  }

  const slotKey = body.slot_key?.trim();
  if (!slotKey?.includes("::")) {
    return NextResponse.json({ error: "slot_key required (pathname::field)" }, { status: 400 });
  }

  if (body.reset || !body.value?.trim()) {
    await db`DELETE FROM site_content_overrides WHERE slot_key = ${slotKey}`;
    clearSiteContentCache();
    return NextResponse.json({ ok: true, reset: true });
  }

  await db`
    INSERT INTO site_content_overrides (slot_key, value, updated_by, updated_at)
    VALUES (${slotKey}, ${body.value.trim()}, ${email}, now())
    ON CONFLICT (slot_key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
  `;
  clearSiteContentCache();
  return NextResponse.json({ ok: true });
}
