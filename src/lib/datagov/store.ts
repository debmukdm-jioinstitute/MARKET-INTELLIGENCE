import { createHash } from "node:crypto";
import { hasDatabase, sql } from "../db.ts";
import type { CatalogEntry } from "./client.ts";

let ready: Promise<void> | null = null;

/** Idempotent schema for the data.gov.in mirror. Kept separate from db.ts ensureSchema so scripts can call it without the app. */
export function ensureDataGovSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS datagov_datasets (
        id text PRIMARY KEY,
        title text NOT NULL,
        description text,
        org text[] NOT NULL DEFAULT '{}',
        sector text[] NOT NULL DEFAULT '{}',
        fields jsonb NOT NULL DEFAULT '[]',
        source_updated_at timestamptz,
        tracked boolean NOT NULL DEFAULT false,
        last_synced_at timestamptz,
        rows_synced int NOT NULL DEFAULT 0,
        source_total int,
        last_error text,
        refreshed_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_datagov_ds_tracked ON datagov_datasets(tracked) WHERE tracked`;
    await db`CREATE INDEX IF NOT EXISTS idx_datagov_ds_title ON datagov_datasets USING gin (to_tsvector('simple', title))`;
    await db`
      CREATE TABLE IF NOT EXISTS datagov_records (
        dataset_id text NOT NULL,
        row_hash text NOT NULL,
        data jsonb NOT NULL,
        first_seen timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (dataset_id, row_hash)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS datagov_sync_log (
        id bigserial PRIMARY KEY,
        dataset_id text,
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

export function rowHash(r: Record<string, string>): string {
  const keys = Object.keys(r).sort();
  return createHash("sha1").update(JSON.stringify(keys.map((k) => [k, r[k]]))).digest("hex");
}

export async function upsertCatalog(entries: CatalogEntry[]): Promise<number> {
  if (!entries.length) return 0;
  await ensureDataGovSchema();
  const db = sql();
  // Neon's http driver: one statement per call — batch via unnest to keep round-trips low.
  await db`
    INSERT INTO datagov_datasets (id, title, description, org, sector, fields, source_updated_at, refreshed_at)
    SELECT id, title, description, string_to_array(NULLIF(org,''), E'\x1f'), string_to_array(NULLIF(sector,''), E'\x1f'),
           fields::jsonb, to_timestamp(NULLIF(upd,0)), now()
    FROM unnest(
      ${entries.map((e) => e.id)}::text[], ${entries.map((e) => e.title)}::text[],
      ${entries.map((e) => e.description ?? "")}::text[],
      ${entries.map((e) => e.org.join("\x1f"))}::text[], ${entries.map((e) => e.sector.join("\x1f"))}::text[],
      ${entries.map((e) => JSON.stringify(e.fields))}::text[], ${entries.map((e) => e.updatedAt ?? 0)}::bigint[]
    ) AS t(id, title, description, org, sector, fields, upd)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, description = EXCLUDED.description, org = COALESCE(EXCLUDED.org, '{}'),
      sector = COALESCE(EXCLUDED.sector, '{}'), fields = EXCLUDED.fields,
      source_updated_at = EXCLUDED.source_updated_at, refreshed_at = now()
  `;
  return entries.length;
}

/** Insert rows, ignoring ones already stored. Returns rows newly inserted. */
export async function insertRecords(datasetId: string, rows: Record<string, string>[]): Promise<number> {
  if (!rows.length) return 0;
  await ensureDataGovSchema();
  const db = sql();
  const seen = new Set<string>();
  const hashes: string[] = [];
  const data: string[] = [];
  for (const r of rows) {
    const h = rowHash(r);
    if (seen.has(h)) continue;
    seen.add(h);
    hashes.push(h);
    data.push(JSON.stringify(r));
  }
  const out = await db`
    INSERT INTO datagov_records (dataset_id, row_hash, data)
    SELECT ${datasetId}, h, d::jsonb FROM unnest(${hashes}::text[], ${data}::text[]) AS t(h, d)
    ON CONFLICT DO NOTHING
    RETURNING 1
  `;
  return out.length;
}

export async function logSync(datasetId: string | null, kind: string, ok: boolean, rows: number, error?: string) {
  try {
    await ensureDataGovSchema();
    await sql()`INSERT INTO datagov_sync_log (dataset_id, kind, ok, rows, error) VALUES (${datasetId}, ${kind}, ${ok}, ${rows}, ${error ?? null})`;
  } catch {
    /* logging must never break a sync */
  }
}
