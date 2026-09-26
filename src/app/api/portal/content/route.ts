import { clearSiteContentCache, getSiteContentCache, setSiteContentCache } from "@/lib/site-content-cache";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL_MS = 15_000;

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json(
      { overrides: {} },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  }

  const now = Date.now();
  const cache = getSiteContentCache();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(
      { overrides: cache.overrides },
      { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } },
    );
  }

  await ensureSchema();
  const rows = (await sql()`
    SELECT slot_key, value FROM site_content_overrides
  `) as { slot_key: string; value: string }[];

  const overrides: Record<string, string> = {};
  for (const r of rows) overrides[r.slot_key] = r.value;
  setSiteContentCache(overrides);

  return NextResponse.json(
    { overrides },
    { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } },
  );
}
