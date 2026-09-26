import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { syncPortalPageRegistry, type PortalPageControlRow } from "@/lib/portal-page-access";
import { buildPortalPageRegistry, DEFAULT_LOCK_MESSAGE } from "@/lib/portal-page-registry";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  if (!hasDatabase()) {
    return NextResponse.json({ controls: [], defaultLockMessage: DEFAULT_LOCK_MESSAGE, configured: false });
  }

  await ensureSchema();
  const db = sql();
  await syncPortalPageRegistry(db, buildPortalPageRegistry());

  const controls = (await db`
    SELECT href, label, nav_section, nav_group, sort_order, enabled, locked, lock_message, applies_to_children, updated_at
    FROM portal_page_controls
    ORDER BY nav_section, nav_group, sort_order, label
  `) as PortalPageControlRow[];

  return NextResponse.json({ controls, defaultLockMessage: DEFAULT_LOCK_MESSAGE, configured: true });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    href?: string;
    enabled?: boolean;
    locked?: boolean;
    lock_message?: string | null;
    bulk?: { prefix: string; enabled?: boolean; locked?: boolean; lock_message?: string | null };
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await ensureSchema();
  const db = sql();

  if (body.bulk?.prefix) {
    const prefix = body.bulk.prefix.trim();
    if (!prefix.startsWith("/")) {
      return NextResponse.json({ error: "prefix must start with /" }, { status: 400 });
    }
    const like = prefix.endsWith("/") ? `${prefix}%` : `${prefix}%`;
    const rows = (await db`
      SELECT href FROM portal_page_controls
      WHERE href = ${prefix} OR href LIKE ${like}
    `) as { href: string }[];

    for (const row of rows) {
      if (body.bulk.enabled !== undefined) {
        await db`UPDATE portal_page_controls SET enabled = ${body.bulk.enabled}, updated_at = now() WHERE href = ${row.href}`;
      }
      if (body.bulk.locked !== undefined) {
        await db`UPDATE portal_page_controls SET locked = ${body.bulk.locked}, updated_at = now() WHERE href = ${row.href}`;
      }
      if (body.bulk.lock_message !== undefined) {
        await db`UPDATE portal_page_controls SET lock_message = ${body.bulk.lock_message}, updated_at = now() WHERE href = ${row.href}`;
      }
    }
    return NextResponse.json({ updated: rows.length });
  }

  const href = body.href?.trim();
  if (!href?.startsWith("/")) {
    return NextResponse.json({ error: "href required" }, { status: 400 });
  }

  if (body.enabled !== undefined) {
    await db`UPDATE portal_page_controls SET enabled = ${body.enabled}, updated_at = now() WHERE href = ${href}`;
  }
  if (body.locked !== undefined) {
    await db`UPDATE portal_page_controls SET locked = ${body.locked}, updated_at = now() WHERE href = ${href}`;
  }
  if (body.lock_message !== undefined) {
    await db`UPDATE portal_page_controls SET lock_message = ${body.lock_message}, updated_at = now() WHERE href = ${href}`;
  }

  const [row] = (await db`
    SELECT href, label, nav_section, nav_group, sort_order, enabled, locked, lock_message, applies_to_children, updated_at
    FROM portal_page_controls WHERE href = ${href}
  `) as PortalPageControlRow[];

  if (!row) return NextResponse.json({ error: "Unknown href — run sync from registry first" }, { status: 404 });
  return NextResponse.json({ control: row });
}
