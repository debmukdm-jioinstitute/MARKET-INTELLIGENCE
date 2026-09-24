import { hasDatabase, sql } from "@/lib/db";
import type { SeriesResult } from "./types";

let ready: Promise<void> | null = null;

export function ensureCollectorSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS collected_series (
        id text PRIMARY KEY,
        label text NOT NULL,
        unit text NOT NULL,
        category text NOT NULL,
        provider text NOT NULL,
        url text NOT NULL,
        last_ok timestamptz,
        last_error text,
        last_run timestamptz
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS collected_obs (
        series_id text NOT NULL,
        obs_date date NOT NULL,
        value double precision NOT NULL,
        meta jsonb,
        fetched_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (series_id, obs_date)
      )
    `;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/** Upsert a successful result. Empty results never touch existing rows (last-good is preserved). */
export async function saveSeries(r: SeriesResult): Promise<number> {
  await ensureCollectorSchema();
  const db = sql();
  await db`
    INSERT INTO collected_series (id, label, unit, category, provider, url, last_ok, last_error, last_run)
    VALUES (${r.id}, ${r.label}, ${r.unit}, ${r.category}, ${r.provider}, ${r.url}, now(), NULL, now())
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, unit = EXCLUDED.unit, url = EXCLUDED.url,
      last_ok = now(), last_error = NULL, last_run = now()
  `;
  for (let i = 0; i < r.obs.length; i += 200) {
    const chunk = r.obs.slice(i, i + 200);
    await db`
      INSERT INTO collected_obs (series_id, obs_date, value, meta)
      SELECT ${r.id}::text, d::date, v::double precision, m::jsonb
      FROM unnest(${chunk.map((o) => o.date)}::text[], ${chunk.map((o) => o.value)}::text[], ${chunk.map((o) => JSON.stringify(o.meta ?? null))}::text[]) AS t(d, v, m)
      ON CONFLICT (series_id, obs_date) DO UPDATE SET value = EXCLUDED.value, meta = EXCLUDED.meta, fetched_at = now()
    `;
  }
  return r.obs.length;
}

export async function markFailure(id: string, provider: string, url: string, error: string) {
  await ensureCollectorSchema();
  await sql()`
    INSERT INTO collected_series (id, label, unit, category, provider, url, last_error, last_run)
    VALUES (${id}, ${id}, '', 'macro', ${provider}, ${url}, ${error.slice(0, 300)}, now())
    ON CONFLICT (id) DO UPDATE SET last_error = EXCLUDED.last_error, last_run = now()
  `;
}

export type LatestPoint = { id: string; date: string; value: number; prev: number | null; meta: Record<string, unknown> | null };

/** Latest + previous observation per series (for panels). Returns [] without a DB. */
export async function latestPoints(ids: string[]): Promise<LatestPoint[]> {
  if (!hasDatabase() || !ids.length) return [];
  try {
    await ensureCollectorSchema();
    const rows = (await sql()`
      SELECT series_id, obs_date, value, meta,
        lead(value) OVER (PARTITION BY series_id ORDER BY obs_date DESC) AS prev,
        row_number() OVER (PARTITION BY series_id ORDER BY obs_date DESC) AS rn
      FROM collected_obs WHERE series_id = ANY(${ids})
    `) as { series_id: string; obs_date: Date | string; value: number; meta: Record<string, unknown> | null; prev: number | null; rn: string }[];
    return rows
      .filter((r) => Number(r.rn) === 1)
      .map((r) => ({
        id: r.series_id,
        date: (r.obs_date instanceof Date ? r.obs_date.toISOString() : String(r.obs_date)).slice(0, 10),
        value: Number(r.value),
        prev: r.prev == null ? null : Number(r.prev),
        meta: r.meta,
      }));
  } catch {
    return [];
  }
}

export async function seriesHistory(id: string, limit = 500) {
  await ensureCollectorSchema();
  const rows = (await sql()`
    SELECT obs_date, value FROM collected_obs WHERE series_id = ${id} ORDER BY obs_date DESC LIMIT ${limit}
  `) as { obs_date: Date | string; value: number }[];
  return rows
    .map((r) => ({ date: (r.obs_date instanceof Date ? r.obs_date.toISOString() : String(r.obs_date)).slice(0, 10), value: Number(r.value) }))
    .reverse();
}

export async function collectorStatus() {
  await ensureCollectorSchema();
  return sql()`
    SELECT s.id, s.label, s.unit, s.category, s.provider, s.url, s.last_ok, s.last_error, s.last_run,
      (SELECT count(*) FROM collected_obs o WHERE o.series_id = s.id)::int AS points,
      (SELECT max(obs_date) FROM collected_obs o WHERE o.series_id = s.id) AS latest_date
    FROM collected_series s ORDER BY s.category, s.id
  `;
}
