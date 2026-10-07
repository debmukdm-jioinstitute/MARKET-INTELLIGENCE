import { requireAdmin } from "@/lib/admin/guard";
import {
  collectorReliability,
  computeHealthScore,
  detectAnomalies,
  forecastStaleness,
  generateOpsBrief,
  xpLiability,
} from "@/lib/admin/insights";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 25_000;

function withTimeout<T>(p: Promise<T>, label: string): Promise<T | { _timeout: true; label: string }> {
  return Promise.race([
    p,
    new Promise<{ _timeout: true; label: string }>((resolve) =>
      setTimeout(() => resolve({ _timeout: true, label }), TIMEOUT_MS),
    ),
  ]);
}

function unwrap<T>(v: T | { _timeout: true; label: string } | undefined, fallback: T): T {
  if (!v || (typeof v === "object" && "_timeout" in v)) return fallback;
  return v as T;
}

/**
 * GET /api/admin/intelligence — Admin Mission Control "AI Insights" payload.
 * ?refresh=1 bypasses the 6h ops-brief cache. All computes run in parallel
 * with a 25s cap; any slow/failed compute degrades to a neutral fallback.
 */
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  const [health, anomalies, staleness, reliability, liability, brief] = await Promise.all([
    withTimeout(computeHealthScore(), "health"),
    withTimeout(detectAnomalies(), "anomalies"),
    withTimeout(forecastStaleness(), "staleness"),
    withTimeout(collectorReliability(), "reliability"),
    withTimeout(xpLiability(), "xpLiability"),
    withTimeout(generateOpsBrief(refresh), "brief"),
  ]);

  return NextResponse.json({
    health: unwrap(health, {
      score: 50,
      grade: "C",
      components: {
        freshness: { score: 50, detail: "unavailable", available: false },
        cron: { score: 50, detail: "unavailable", available: false },
        growth: { score: 50, detail: "unavailable", available: false },
        engagement: { score: 50, detail: "unavailable", available: false },
      },
      computed_at: new Date().toISOString(),
    }),
    anomalies: unwrap(anomalies, []),
    stalenessForecast: unwrap(staleness, []),
    collectorReliability: unwrap(reliability, []),
    xpLiability: unwrap(liability, {
      total_outstanding_xp: 0,
      users_with_xp: 0,
      near_redemption_count: 0,
      free_months_liability: 0,
      earn_velocity_xp_per_day: 0,
      projected_free_months_per_month: 0,
      computed_at: new Date().toISOString(),
    }),
    brief: unwrap(brief, {
      text: "• Intelligence engine warming up — refresh in a moment.",
      generated_at: new Date().toISOString(),
      source: "template" as const,
    }),
    generated_at: new Date().toISOString(),
  });
}
