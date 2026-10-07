import { cronUnauthorized } from "@/lib/api-guard";
import { finishRun, startRun, triggerOf, withTimeout } from "@/lib/admin/cron-log";
import { NextResponse } from "next/server";
import { hasDatabase, sql } from "@/lib/db";
import { buildStress } from "@/lib/stress/build";
import { ensureStressSchema, maybeFireAlert, saveStress } from "@/lib/stress/store";
import type { StressResult } from "@/lib/stress/compute";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 45s compute budget: Vercel kills this function at 60s (the collect-market-data workflow failure). */
const BUILD_BUDGET_MS = 45_000;

/** Latest persisted snapshot, for the stale fallback when a fresh build times out. */
async function latestSnapshot(): Promise<StressResult | null> {
  try {
    if (!hasDatabase()) return null;
    await ensureStressSchema();
    const rows = (await sql()`
      SELECT payload FROM stress_history ORDER BY ts DESC LIMIT 1
    `) as { payload: StressResult }[];
    return rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}

/** Every 3h with the collector: snapshot the stress index, then evaluate the corroborated-alert gate. ?dry=1 computes only. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const runId = await startRun("stress", triggerOf(req));
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    let result: StressResult;
    let stale = false;
    try {
      result = await withTimeout(buildStress(), BUILD_BUDGET_MS, "buildStress");
    } catch (e) {
      // Fresh build timed out (or errored): fall back to the latest snapshot so the
      // workflow step returns 200 instead of failing. The snapshot type has no
      // meta field, so staleness is carried in the response + run journal.
      const prev = await latestSnapshot();
      if (!prev || dry) throw e;
      stale = true;
      result = prev;
    }
    if (dry || !hasDatabase()) {
      await finishRun(runId, { status: "success", rowsWritten: 0 });
      return NextResponse.json({ ok: true, persisted: false, stale, result });
    }
    await saveStress(result);
    const alert = await maybeFireAlert(result);
    await finishRun(runId, {
      status: "success",
      rowsWritten: 1,
      error: stale ? "stale snapshot: fresh build exceeded 45s budget" : undefined,
    });
    return NextResponse.json({
      ok: true,
      persisted: true,
      stale,
      score: result.score,
      band: result.band,
      convergence: result.convergence,
      alert,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishRun(runId, { status: "error", error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
