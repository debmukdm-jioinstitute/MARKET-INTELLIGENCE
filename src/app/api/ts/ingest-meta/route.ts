import { NextResponse } from "next/server";
import { cronUnauthorized } from "@/lib/api-guard";
import { hasDatabase, sql, toDateString } from "@/lib/db";
import { ensureTsSchema } from "@/lib/ts-charts/server";

export const dynamic = "force-dynamic";

/**
 * Runner bookkeeping for scripts/ts-ingest (the runner never touches the DB directly).
 * GET  ?source=<id>&anchor=<series_id>  → { latestObs, files:[{url,sha256,etag,last_modified}] }
 * POST { files?:[...], status?:[{dataset,anchor,lagDays,error?,runMs?}] }  → upserts ts_source_files / ts_dataset_status
 * Bearer CRON_SECRET on both.
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) return NextResponse.json({ error: "no database" }, { status: 503 });
  const u = new URL(req.url);
  const source = u.searchParams.get("source") ?? "";
  const anchor = u.searchParams.get("anchor") ?? "";
  await ensureTsSchema();
  const db = sql();
  const latest = anchor ? ((await db`SELECT max(obs_date) AS d FROM collected_obs WHERE series_id = ${anchor}`) as unknown as { d: unknown }[])[0]?.d : null;
  const files = source ? await db`SELECT url, sha256, etag, last_modified FROM ts_source_files WHERE source_id = ${source} ORDER BY fetched_at DESC LIMIT 80` : [];
  return NextResponse.json({ latestObs: latest ? toDateString(latest) : null, files });
}

type FileIn = { url: string; source_id: string; etag?: string | null; last_modified?: string | null; sha256?: string | null; bytes?: number; status?: number };
type StatusIn = { dataset: string; anchor: string; lagDays: number; error?: string | null; runMs?: number };

export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) return NextResponse.json({ error: "no database" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { files?: FileIn[]; status?: StatusIn[] } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  await ensureTsSchema();
  const db = sql();
  for (const f of body.files ?? []) {
    await db`INSERT INTO ts_source_files (url, source_id, etag, last_modified, sha256, bytes, status, fetched_at)
      VALUES (${f.url}, ${f.source_id}, ${f.etag ?? null}, ${f.last_modified ?? null}, ${f.sha256 ?? null}, ${f.bytes ?? null}, ${f.status ?? null}, now())
      ON CONFLICT (url) DO UPDATE SET etag = EXCLUDED.etag, last_modified = EXCLUDED.last_modified, sha256 = EXCLUDED.sha256,
        bytes = EXCLUDED.bytes, status = EXCLUDED.status, fetched_at = now()`;
  }
  for (const s of body.status ?? []) {
    // state: failing on runner error; otherwise current/behind by age of latest observation (never "current" without data).
    await db`INSERT INTO ts_dataset_status (dataset, latest_obs, expected_lag_days, state, last_run, run_ms, last_error)
      SELECT ${s.dataset}, m.d, ${s.lagDays},
        CASE WHEN ${s.error ?? null}::text IS NOT NULL THEN 'failing'
             WHEN m.d IS NOT NULL AND (current_date - m.d) <= ${s.lagDays} THEN 'current' ELSE 'behind' END,
        now(), ${s.runMs ?? null}, ${s.error ?? null}
      FROM (SELECT max(obs_date) AS d FROM collected_obs WHERE series_id = ${s.anchor}) m
      ON CONFLICT (dataset) DO UPDATE SET latest_obs = EXCLUDED.latest_obs, expected_lag_days = EXCLUDED.expected_lag_days,
        state = EXCLUDED.state, last_run = now(), run_ms = EXCLUDED.run_ms, last_error = EXCLUDED.last_error`;
  }
  return NextResponse.json({ ok: true });
}
