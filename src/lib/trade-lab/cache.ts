import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import type { LabResult, Timeframe } from "./types";

/**
 * Result cache + last-good store. Postgres when configured (shared across serverless instances),
 * in-memory otherwise. A cached row is real data computed earlier — never invented.
 */
const mem = new Map<string, { at: number; data: LabResult }>();
let ready: Promise<void> | null = null;

function schema() {
  ready ??= (async () => {
    await ensureSchema().catch(() => {});
    await sql()`CREATE TABLE IF NOT EXISTS trade_lab_cache (
      symbol text NOT NULL, tf text NOT NULL, data jsonb NOT NULL, computed_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (symbol, tf))`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export const ttlSeconds = (tf: Timeframe) => (tf === "5m" || tf === "15m" ? 60 : tf === "1h" ? 180 : 600);

export async function readLab(symbol: string, tf: Timeframe): Promise<{ data: LabResult; ageSec: number } | null> {
  const key = `${symbol}|${tf}`;
  if (hasDatabase()) {
    try {
      await schema();
      const rows = (await sql()`SELECT data, extract(epoch from (now() - computed_at))::int AS age FROM trade_lab_cache WHERE symbol = ${symbol} AND tf = ${tf}`) as unknown as { data: LabResult; age: number }[];
      if (rows[0]) return { data: rows[0].data, ageSec: rows[0].age };
    } catch {
      /* fall through to memory */
    }
  }
  const m = mem.get(key);
  return m ? { data: m.data, ageSec: Math.round((Date.now() - m.at) / 1000) } : null;
}

export async function writeLab(symbol: string, tf: Timeframe, data: LabResult): Promise<void> {
  mem.set(`${symbol}|${tf}`, { at: Date.now(), data });
  if (mem.size > 400) mem.delete(mem.keys().next().value as string);
  if (!hasDatabase()) return;
  try {
    await schema();
    await sql()`INSERT INTO trade_lab_cache (symbol, tf, data, computed_at) VALUES (${symbol}, ${tf}, ${JSON.stringify(data)}::jsonb, now())
      ON CONFLICT (symbol, tf) DO UPDATE SET data = EXCLUDED.data, computed_at = now()`;
  } catch {
    /* cache is best-effort */
  }
}
