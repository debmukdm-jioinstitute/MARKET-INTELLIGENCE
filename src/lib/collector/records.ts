import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { announcementHash, cleanRow, PG_TYPE, snake, tableSpec, type TableSpec } from "./record-tables";
import type { CollectorContext, RecordBatch } from "./types";

export { announcementHash };

/**
 * Validation + persistence for collector event rows. Same honesty rules as the
 * series ingest: malformed rows are dropped, never repaired or invented; an
 * empty batch writes nothing.
 */

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

export function cleanRecordBatch(raw: unknown): RecordBatch | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const spec = tableSpec(r.table);
  if (!spec || !Array.isArray(r.rows)) return null;
  const rows = r.rows.map((x) => cleanRow(spec, x)).filter((x): x is Record<string, unknown> => x !== null);
  const watermarks: Record<string, string> = {};
  if (typeof r.watermarks === "object" && r.watermarks !== null) {
    for (const [k, v] of Object.entries(r.watermarks)) {
      const val = str(v);
      if (/^[A-Za-z0-9:_.&-]{1,80}$/.test(k) && val) watermarks[k] = val.slice(0, 80);
    }
  }
  return { table: spec.name, rows, watermark: str(r.watermark)?.slice(0, 80) ?? undefined, ...(Object.keys(watermarks).length ? { watermarks } : {}) };
}

export function cleanRecordBatches(raw: unknown): RecordBatch[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map(cleanRecordBatch).filter((b): b is RecordBatch => b !== null);
}

/** Collector id that owns a table's single cursor (batch.watermark). */
const OWNER: Record<string, string> = {
  broker_calls: "broker-calls",
  company_announcements: "nse-announcements",
  shareholding: "shareholding",
  credit_ratings: "credit-ratings",
  concall_summaries: "concall-summaries",
  ipos: "ipos",
  trend_series: "google-trends",
  regulatory_events: "legal-risk",
  sentiment_daily: "sentiment",
};

async function setWatermark(id: string, value: string) {
  await sql()`
    INSERT INTO collector_watermarks (collector_id, value, updated_at) VALUES (${id}, ${value}, now())
    ON CONFLICT (collector_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

export async function readWatermark(key: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  try {
    await ensureSchema();
    const rows = (await sql()`SELECT value FROM collector_watermarks WHERE collector_id = ${key}`) as { value: string }[];
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

export async function readWatermarks(prefix: string): Promise<Record<string, string>> {
  if (!hasDatabase()) return {};
  try {
    await ensureSchema();
    const rows = (await sql()`SELECT collector_id, value FROM collector_watermarks WHERE starts_with(collector_id, ${prefix})`) as { collector_id: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.collector_id, r.value]));
  } catch {
    return {};
  }
}

/** Direct-DB context for the Vercel path (the Actions runner uses an HTTP context instead). */
export const dbContext: CollectorContext = { watermark: readWatermark, watermarks: readWatermarks };

/** Builds the single idempotent upsert for a table spec. Identifiers come from trusted constants, never from rows. */
export function buildUpsertSql(spec: TableSpec): string {
  if (spec.customSql) return spec.customSql;
  const cols = spec.cols.map((c) => ({ col: snake(c.f), pg: PG_TYPE[c.k] }));
  const names = cols.map((c) => c.col).join(", ");
  const recordset = cols.map((c) => `${c.col} ${c.pg}`).join(", ");
  const keys = new Set(spec.conflict);
  const conflict =
    spec.onConflict === "nothing"
      ? `ON CONFLICT (${spec.conflict.join(", ")}) DO NOTHING`
      : `ON CONFLICT (${spec.conflict.join(", ")}) DO UPDATE SET ${cols
          .filter((c) => !keys.has(c.col))
          .map((c) => `${c.col} = COALESCE(EXCLUDED.${c.col}, ${spec.name}.${c.col})`)
          .join(", ")}`;
  return `INSERT INTO ${spec.name} (${names}) SELECT ${names} FROM jsonb_to_recordset($1::jsonb) AS x(${recordset}) ${conflict} RETURNING 1 AS ok`;
}

/** jsonb_to_recordset matches on column names, so row keys go camelCase → snake_case. */
export const toRecordsetJson = (rows: Record<string, unknown>[]) =>
  JSON.stringify(rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [snake(k), v]))));

/**
 * Dedupe inside one batch — Postgres rejects an upsert touching a row twice.
 * "update" tables merge duplicates (later non-null values win, nulls never erase); "nothing" tables keep the first.
 */
export function dedupeBatch(spec: TableSpec, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const fieldOf = (col: string) => spec.cols.find((c) => snake(c.f) === col)!.f;
  const seen = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const key = spec.conflict.map((c) => String(r[fieldOf(c)])).join("\u0000");
    const prev = seen.get(key);
    if (!prev) seen.set(key, r);
    else if (spec.onConflict === "update") seen.set(key, { ...prev, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null)) });
  }
  return [...seen.values()];
}

/** Idempotent write; returns rows actually written (duplicates skipped via unique keys). */
export async function saveRecords(batch: RecordBatch): Promise<{ inserted: number; skipped: number }> {
  const spec = tableSpec(batch.table);
  if (!spec) throw new Error(`unknown record table: ${batch.table}`);
  await ensureSchema();
  const db = sql();
  const rows = dedupeBatch(spec, batch.rows);
  let inserted = 0;
  const text = buildUpsertSql(spec);
  for (let i = 0; i < rows.length; i += 200) {
    const res = (await db.query(text, [toRecordsetJson(rows.slice(i, i + 200))])) as unknown[];
    inserted += res.length;
  }
  if (spec.afterSql && rows.length) {
    const minDay = rows.map((r) => String(r.day)).sort()[0];
    await db.query(spec.afterSql, [minDay]);
  }
  const owner = OWNER[spec.name];
  if (batch.watermark && owner) await setWatermark(owner, batch.watermark);
  for (const [k, v] of Object.entries(batch.watermarks ?? {})) await setWatermark(k, v);
  return { inserted, skipped: batch.rows.length - inserted };
}
