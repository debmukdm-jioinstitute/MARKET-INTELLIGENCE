import { computeAnalyticsDashboard } from "@/lib/admin/compute-analytics-dashboard";
import type { AnalyticsDashboardPayload } from "@/lib/admin/analytics-catalog";
import { requireAdmin } from "@/lib/admin/guard";
import { ensureAlertSchema } from "@/lib/alerts/store";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EMPTY: AnalyticsDashboardPayload = {
  generatedAt: new Date().toISOString(),
  metrics: {},
  metricHints: {},
  daily: [],
  topPaths: [],
  topFeatures: [],
  trafficMix: [],
};

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json(EMPTY);

  await ensureSchema();
  await ensureAlertSchema();
  const payload = await computeAnalyticsDashboard(sql());
  return NextResponse.json(payload);
}
