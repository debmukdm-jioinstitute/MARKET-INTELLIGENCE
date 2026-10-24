import { hasDatabase, runDdl, sql, toDateString } from "@/lib/db";
import { ensureCollectorSchema } from "@/lib/collector/store";
import { downsample, indicatorStats } from "./transform";
import { getChartDef } from "./registry";
import type { ChartPayload } from "./types";

const DDL = [
  "ALTER TABLE collected_series ADD COLUMN IF NOT EXISTS dataset text, ADD COLUMN IF NOT EXISTS freq text, ADD COLUMN IF NOT EXISTS fmt text, ADD COLUMN IF NOT EXISTS topic text, ADD COLUMN IF NOT EXISTS method_url text",
  "CREATE TABLE IF NOT EXISTS ts_source_files(url text PRIMARY KEY, source_id text NOT NULL, etag text, last_modified text, sha256 text, bytes int, status int, fetched_at timestamptz DEFAULT now())",
  "CREATE TABLE IF NOT EXISTS ts_dataset_status(dataset text PRIMARY KEY, latest_obs date, expected_lag_days int NOT NULL, state text CHECK (state IN ('current','behind','failing')), last_run timestamptz, run_ms int, last_error text)",
  "CREATE TABLE IF NOT EXISTS ts_indicator_stats(series_id text PRIMARY KEY, band_lo double precision, band_hi double precision, rec_hi double precision, rec_hi_date date, rec_lo double precision, rec_lo_date date, latest double precision, latest_date date, position text CHECK (position IN ('inside','above','below')), updated_at timestamptz DEFAULT now())",
  "CREATE TABLE IF NOT EXISTS ts_events(id text PRIMARY KEY, kind text, symbol text, title text, event_date date, meta jsonb)",
  "CREATE INDEX IF NOT EXISTS collected_obs_series_date ON collected_obs(series_id, obs_date DESC)",
];

let ready: Promise<void> | null = null;
/** Mirrors scripts/migrations/2026-10-ts.sql so API routes work before `db:migrate` has run. */
export function ensureTsSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    await ensureCollectorSchema();
    await runDdl(sql(), DDL);
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

type ObsRow = { series_id: string; obs_date: unknown; value: number };

export async function loadSeriesObs(ids: string[], from?: string, to?: string): Promise<ObsRow[]> {
  await ensureTsSchema();
  return (await sql()`
    SELECT series_id, obs_date, value FROM collected_obs
    WHERE series_id = ANY(${ids}::text[])
      AND (${from ?? null}::date IS NULL OR obs_date >= ${from ?? null}::date)
      AND (${to ?? null}::date IS NULL OR obs_date <= ${to ?? null}::date)
    ORDER BY obs_date ASC`) as unknown as ObsRow[];
}

/** Build the chart payload for a registry id. Returns null for unknown ids. Never invents data: no rows → empty `rows`. */
export async function buildChart(id: string, from?: string, to?: string): Promise<ChartPayload | null> {
  const def = getChartDef(id);
  if (!def) return null;
  const cols = def.series.map((s) => s.col);
  const raw = hasDatabase() ? await loadSeriesObs(cols, def.band ? undefined : from, to) : [];
  const byDate = new Map<string, Record<string, number | null | string>>();
  for (const r of raw) {
    const d = toDateString(r.obs_date);
    const row = byDate.get(d) ?? { date: d };
    row[r.series_id] = Number(r.value);
    byDate.set(d, row);
  }
  const all = [...byDate.values()].sort((a, b) => (a.date as string).localeCompare(b.date as string)) as ChartPayload["rows"];
  const filled = all.map((r) => { const o = { ...r }; for (const c of cols) o[c] ??= null; return o; });

  if (def.kind === "curve") {
    const latest = filled[filled.length - 1];
    const curveRows = latest
      ? def.series.map((s) => ({
          date: s.label,
          yield: latest[s.col] as number | null,
        }))
      : [];
    return {
      id: def.id, kind: def.kind, title: def.title, source: def.source, methodUrl: def.methodUrl,
      updated: latest ? (latest.date as string) : "never",
      fmt: def.fmt, digits: def.digits,
      series: [{ col: "yield", label: "Yield (%)" }],
      rows: curveRows,
    };
  }

  let band: [number, number] | undefined;
  let records: ChartPayload["records"];
  if (def.band) {
    const pts = filled.filter((r) => r[cols[0]] != null).map((r) => ({ date: r.date, v: r[cols[0]] as number }));
    const st = indicatorStats(pts);
    if (st) {
      band = [st.bandLo, st.bandHi];
      records = { hi: { date: st.recHi.date, v: st.recHi.v }, lo: { date: st.recLo.date, v: st.recLo.v } };
    }
  }
  const rows = downsample(filled.filter((r) => (!from || r.date >= from)), 1500);
  return {
    id: def.id, kind: def.kind, title: def.title, source: def.source, methodUrl: def.methodUrl,
    updated: rows.length ? rows[rows.length - 1].date : "never",
    fmt: def.fmt, digits: def.digits, series: def.series, rows, band, records, transform: def.transform,
  };
}
