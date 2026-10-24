import { NextResponse } from "next/server";
import { cronUnauthorized } from "@/lib/api-guard";
import { hasDatabase, sql, toDateString } from "@/lib/db";
import { ensureTsSchema } from "@/lib/ts-charts/server";
import { INDICATORS } from "@/lib/ts-charts/registry";
import { indicatorStats } from "@/lib/ts-charts/transform";

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
  const latest = anchor && !anchor.startsWith("events:") ? ((await db`SELECT max(obs_date) AS d FROM collected_obs WHERE series_id = ${anchor}`) as unknown as { d: unknown }[])[0]?.d : null;
  const files = source ? await db`SELECT url, sha256, etag, last_modified FROM ts_source_files WHERE source_id = ${source} ORDER BY fetched_at DESC LIMIT 80` : [];
  return NextResponse.json({ latestObs: latest ? toDateString(latest) : null, files });
}

type FileIn = { url: string; source_id: string; etag?: string | null; last_modified?: string | null; sha256?: string | null; bytes?: number; status?: number };
type EventIn = { id: string; kind: string; symbol?: string | null; title: string; event_date: string; meta?: Record<string, unknown> };
type StatusIn = { dataset: string; anchor: string; lagDays: number; error?: string | null; runMs?: number };

export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) return NextResponse.json({ error: "no database" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { files?: FileIn[]; status?: StatusIn[]; events?: EventIn[] } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  await ensureTsSchema();
  const db = sql();
  for (const f of body.files ?? []) {
    await db`INSERT INTO ts_source_files (url, source_id, etag, last_modified, sha256, bytes, status, fetched_at)
      VALUES (${f.url}, ${f.source_id}, ${f.etag ?? null}, ${f.last_modified ?? null}, ${f.sha256 ?? null}, ${f.bytes ?? null}, ${f.status ?? null}, now())
      ON CONFLICT (url) DO UPDATE SET etag = EXCLUDED.etag, last_modified = EXCLUDED.last_modified, sha256 = EXCLUDED.sha256,
        bytes = EXCLUDED.bytes, status = EXCLUDED.status, fetched_at = now()`;
  }
  for (const e of body.events ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.event_date) || !e.id || !e.title) continue;
    await db`INSERT INTO ts_events (id, kind, symbol, title, event_date, meta)
      VALUES (${e.id}, ${e.kind}, ${e.symbol ?? null}, ${e.title.slice(0, 300)}, ${e.event_date}::date, ${JSON.stringify(e.meta ?? null)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, event_date = EXCLUDED.event_date, meta = EXCLUDED.meta`;
  }
  for (const s of body.status ?? []) {
    // state: failing on runner error; otherwise current/behind by age of latest observation (never "current" without data).
    await db`INSERT INTO ts_dataset_status (dataset, latest_obs, expected_lag_days, state, last_run, run_ms, last_error)
      SELECT ${s.dataset}, m.d, ${s.lagDays},
        CASE WHEN ${s.error ?? null}::text IS NOT NULL THEN 'failing'
             WHEN m.d IS NOT NULL AND (current_date - m.d) <= ${s.lagDays} THEN 'current' ELSE 'behind' END,
        now(), ${s.runMs ?? null}, ${s.error ?? null}
      FROM (SELECT CASE WHEN ${s.anchor}::text LIKE 'events:%'
              THEN (SELECT max(event_date) FROM ts_events WHERE (substr(${s.anchor}::text, 8) = 'action' AND kind <> 'holiday') OR kind = substr(${s.anchor}::text, 8))
              ELSE (SELECT max(obs_date) FROM collected_obs WHERE series_id = ${s.anchor}) END AS d) m
      ON CONFLICT (dataset) DO UPDATE SET latest_obs = EXCLUDED.latest_obs, expected_lag_days = EXCLUDED.expected_lag_days,
        state = EXCLUDED.state, last_run = now(), run_ms = EXCLUDED.run_ms, last_error = EXCLUDED.last_error`;
  }
  // Populate ts_indicator_stats for all indicators
  try {
    for (const ind of INDICATORS) {
      const col = ind.series[0]?.col;
      if (!col) continue;
      const raw = (await db`SELECT obs_date, value FROM collected_obs WHERE series_id = ${col} AND value IS NOT NULL ORDER BY obs_date ASC`) as unknown as { obs_date: unknown; value: number }[];
      if (!raw.length) continue;
      const pts = raw.map((r) => ({ date: toDateString(r.obs_date), v: Number(r.value) }));
      const st = indicatorStats(pts);
      if (!st) continue;
      await db`INSERT INTO ts_indicator_stats (series_id, band_lo, band_hi, rec_hi, rec_hi_date, rec_lo, rec_lo_date, latest, latest_date, position, updated_at)
        VALUES (${col}, ${st.bandLo}, ${st.bandHi}, ${st.recHi.v}, ${st.recHi.date}::date, ${st.recLo.v}, ${st.recLo.date}::date, ${st.latest.v}, ${st.latest.date}::date, ${st.position}, now())
        ON CONFLICT (series_id) DO UPDATE SET band_lo = EXCLUDED.band_lo, band_hi = EXCLUDED.band_hi,
          rec_hi = EXCLUDED.rec_hi, rec_hi_date = EXCLUDED.rec_hi_date, rec_lo = EXCLUDED.rec_lo, rec_lo_date = EXCLUDED.rec_lo_date,
          latest = EXCLUDED.latest, latest_date = EXCLUDED.latest_date, position = EXCLUDED.position, updated_at = now()`;
    }
  } catch (err) {
    console.error("Failed to populate ts_indicator_stats:", err);
  }

  return NextResponse.json({ ok: true });
}
