import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { syncPortalPageRegistry, type PortalPageControlRow } from "@/lib/portal-page-access";
import { buildPortalPageRegistry, DEFAULT_LOCK_MESSAGE } from "@/lib/portal-page-registry";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL_MS = 30_000;
let cache: { at: number; payload: unknown } | null = null;

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json(
      { controls: [] as PortalPageControlRow[], defaultLockMessage: DEFAULT_LOCK_MESSAGE, configured: false },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  }

  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  }

  await ensureSchema();
  const db = sql();
  await syncPortalPageRegistry(db, buildPortalPageRegistry());

  const controls = (await db`
    SELECT href, label, nav_section, nav_group, sort_order, enabled, locked, lock_message, applies_to_children, updated_at
    FROM portal_page_controls
    ORDER BY sort_order, label
  `) as PortalPageControlRow[];

  const payload = { controls, defaultLockMessage: DEFAULT_LOCK_MESSAGE, configured: true };
  cache = { at: now, payload };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
  });
}
