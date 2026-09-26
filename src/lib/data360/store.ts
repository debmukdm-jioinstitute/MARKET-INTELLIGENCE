import { createHash } from "node:crypto";
import { hasDatabase, sql } from "../db.ts";

let ready: Promise<void> | null = null;

export function ensureData360Schema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS data360_datasets (
        database_id text PRIMARY KEY,
        series_count int NOT NULL DEFAULT 0,
        indicators_cataloged int NOT NULL DEFAULT 0,
        last_catalog_at timestamptz,
        last_error text
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS data360_indicators (
        database_id text NOT NULL,
        indicator_id text NOT NULL,
        name text,
        obs_synced int NOT NULL DEFAULT 0,
        obs_total int,
        data_skip int NOT NULL DEFAULT 0,
        complete boolean NOT NULL DEFAULT false,
        tracked boolean NOT NULL DEFAULT true,
        last_synced_at timestamptz,
        last_error text,
        PRIMARY KEY (database_id, indicator_id)
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_data360_ind_complete ON data360_indicators(complete, last_synced_at)`;
    await db`
      CREATE TABLE IF NOT EXISTS data360_ref_cursors (
        database_id text NOT NULL,
        indicator_id text NOT NULL,
        ref_area text NOT NULL,
        data_skip int NOT NULL DEFAULT 0,
        obs_total int,
        complete boolean NOT NULL DEFAULT false,
        last_synced_at timestamptz,
        last_error text,
        PRIMARY KEY (database_id, indicator_id, ref_area)
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_data360_cursor_pending ON data360_ref_cursors(complete, last_synced_at)`;
    await db`
      CREATE TABLE IF NOT EXISTS data360_observations (
        obs_key text PRIMARY KEY,
        database_id text NOT NULL,
        indicator_id text NOT NULL,
        ref_area text NOT NULL,
        time_period text NOT NULL,
        obs_value numeric,
        unit_measure text,
        freq text,
        payload jsonb NOT NULL,
        synced_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_data360_obs_series ON data360_observations(database_id, indicator_id, ref_area, time_period DESC)`;
    await db`
      CREATE TABLE IF NOT EXISTS data360_sync_log (
        id bigserial PRIMARY KEY,
        database_id text,
        indicator_id text,
        kind text NOT NULL,
        ok boolean NOT NULL,
        rows int NOT NULL DEFAULT 0,
        error text,
        ran_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export function obsKey(row: Record<string, unknown>): string {
  const keys = [
    "DATABASE_ID",
    "INDICATOR",
    "REF_AREA",
    "TIME_PERIOD",
    "SEX",
    "AGE",
    "URBANISATION",
    "COMP_BREAKDOWN_1",
    "COMP_BREAKDOWN_2",
    "COMP_BREAKDOWN_3",
    "FREQ",
    "UNIT_MEASURE",
  ];
  const payload = keys.map((k) => [k, row[k] ?? ""]);
  return createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

export async function logSync(
  databaseId: string | null,
  indicatorId: string | null,
  kind: string,
  ok: boolean,
  rows: number,
  error?: string,
) {
  await ensureData360Schema();
  await sql()`INSERT INTO data360_sync_log (database_id, indicator_id, kind, ok, rows, error)
    VALUES (${databaseId}, ${indicatorId}, ${kind}, ${ok}, ${rows}, ${error ?? null})`;
}
