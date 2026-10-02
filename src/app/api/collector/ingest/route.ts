import { cronUnauthorized } from "@/lib/api-guard";
import { hasDatabase } from "@/lib/db";
import { clearFailure, markFailure, saveSeries } from "@/lib/collector/store";
import { saveRecords } from "@/lib/collector/records";
import { batchesOf } from "@/lib/collector/types";
import { validateIngestBody } from "@/lib/collector/ingest";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ingest API for external collectors (Phase 3: GitHub Actions runners as the
 * free Apify replacement).
 *
 * POST /api/collector/ingest
 * Headers: Authorization: Bearer <CRON_SECRET>   (same secret as the other crons)
 * Body:    { series?: SeriesResult[], ok?: string[], failures?: { id, error }[] }
 *          A series may carry `records` (event rows for broker_calls / company_announcements);
 *          rows are validated, deduped by unique key and inserted idempotently.
 *
 * - series: validated strictly; any series with zero usable observations is
 *   REJECTED and reported, never written (last-good data is preserved).
 * - ok: collector ids whose run succeeded → clears their recorded failure.
 * - failures: recorded via markFailure(`collector:<id>`) for the Phase 5
 *   health monitor (visible today at GET /api/collector).
 */
export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured on this deployment" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { series, ok, failures, rejected } = validateIngestBody(body);
  if (!series.length && !ok.length && !failures.length) {
    return NextResponse.json({ error: "Nothing usable to ingest", rejected }, { status: 400 });
  }

  let points = 0;
  const saved: string[] = [];
  const records: { table: string; received: number; inserted: number; skipped: number }[] = [];
  for (const s of series) {
    try {
      points += await saveSeries(s);
      saved.push(s.id);
      for (const b of batchesOf(s)) {
        const r = await saveRecords(b);
        records.push({ table: b.table, received: b.rows.length, ...r });
      }
    } catch (e) {
      rejected.push({ id: s.id, reason: e instanceof Error ? e.message : "save failed" });
    }
  }

  const cleared: string[] = [];
  for (const id of ok) {
    try {
      await clearFailure(id);
      cleared.push(id);
    } catch {
      /* failure bookkeeping must never fail the ingest */
    }
  }

  const recorded: string[] = [];
  for (const f of failures) {
    try {
      await markFailure(`collector:${f.id}`, f.id, "", f.error);
      recorded.push(f.id);
    } catch {
      /* failure bookkeeping must never fail the ingest */
    }
  }

  return NextResponse.json({
    ok: true,
    saved: { series: saved.length, points, ids: saved },
    records,
    cleared,
    recordedFailures: recorded,
    rejected,
  });
}
