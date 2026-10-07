import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";
import { runFraudChecks, type FraudFlag } from "@/lib/admin/fraud-rules";

export const dynamic = "force-dynamic";

let cache: { at: number; flags: FraudFlag[] } | null = null;
const CACHE_MS = 15 * 60 * 1000;

/** GET /api/admin/security/flags → fraud/abuse flags (admin only, cached 15 min). */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ generated_at: new Date().toISOString(), flags: [] });

  const now = Date.now();
  if (!cache || now - cache.at > CACHE_MS) {
    const flags = await runFraudChecks();
    cache = { at: now, flags };
  }
  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const f of cache.flags) bySeverity[f.severity] += 1;
  return NextResponse.json({
    generated_at: new Date(cache.at).toISOString(),
    counts: bySeverity,
    flags: cache.flags,
  });
}
