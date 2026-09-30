import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { getSourceHealth } from "@/lib/health/sources";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/sources → unified source-health monitor.
 * Read-only: scheduled collectors (from collected_series) plus feed-hub sources
 * (recorded by the warm-feed-hub cron). Empty `sources` without a database —
 * health is only ever derived from recorded runs, never invented.
 */
export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json(
      { generatedAt: new Date().toISOString(), counts: null, sources: [], note: "No database configured" },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  }
  try {
    const sources = await getSourceHealth();
    const counts = { healthy: 0, degraded: 0, failing: 0, unknown: 0 };
    for (const s of sources) counts[s.status]++;
    return NextResponse.json(
      { generatedAt: new Date().toISOString(), counts, sources },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
