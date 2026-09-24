import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasDatabase, sql } from "../db";
import type { ReportId } from "./reports";

/**
 * Storage for fetched Prowess reports. Postgres (Neon) when configured, otherwise JSON files under
 * `.prowess-cache/` so local dev works without a database.
 */
export interface StoredReport {
  symbol: string;
  report: ReportId;
  data: unknown;
  fetchedAt: Date;
}

const DIR = path.join(process.cwd(), ".prowess-cache");
let ready: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS prowess_reports (
        symbol text NOT NULL,
        report text NOT NULL,
        data jsonb NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (symbol, report)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS prowess_errors (
        symbol text NOT NULL,
        report text NOT NULL,
        error text NOT NULL,
        failed_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (symbol, report)
      )
    `;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const file = (symbol: string, report: string) => path.join(DIR, `${symbol}__${report}.json`);
const safe = (s: string) => s.replace(/[^A-Za-z0-9&_-]/g, "_");

export async function getStored(symbol: string, report: ReportId): Promise<StoredReport | null> {
  symbol = safe(symbol.toUpperCase());
  if (hasDatabase()) {
    await ensureSchema();
    const rows = await sql()`SELECT data, fetched_at FROM prowess_reports WHERE symbol = ${symbol} AND report = ${report}`;
    return rows[0] ? { symbol, report, data: rows[0].data, fetchedAt: new Date(rows[0].fetched_at as string) } : null;
  }
  try {
    const j = JSON.parse(await readFile(file(symbol, report), "utf8"));
    return { symbol, report, data: j.data, fetchedAt: new Date(j.fetchedAt) };
  } catch {
    return null;
  }
}

export async function putStored(symbol: string, report: ReportId, data: unknown): Promise<void> {
  symbol = safe(symbol.toUpperCase());
  if (hasDatabase()) {
    await ensureSchema();
    await sql()`
      INSERT INTO prowess_reports (symbol, report, data, fetched_at) VALUES (${symbol}, ${report}, ${JSON.stringify(data)}::jsonb, now())
      ON CONFLICT (symbol, report) DO UPDATE SET data = EXCLUDED.data, fetched_at = now()`;
    await sql()`DELETE FROM prowess_errors WHERE symbol = ${symbol} AND report = ${report}`;
    return;
  }
  await mkdir(DIR, { recursive: true });
  await writeFile(file(symbol, report), JSON.stringify({ data, fetchedAt: new Date().toISOString() }));
}

export async function putError(symbol: string, report: ReportId, error: string): Promise<void> {
  symbol = safe(symbol.toUpperCase());
  if (!hasDatabase()) return;
  await ensureSchema();
  await sql()`
    INSERT INTO prowess_errors (symbol, report, error) VALUES (${symbol}, ${report}, ${error.slice(0, 500)})
    ON CONFLICT (symbol, report) DO UPDATE SET error = EXCLUDED.error, failed_at = now()`;
}

/** Map "SYMBOL|report" → fetchedAt (and failures, so the sync doesn't hammer unmatched symbols). */
export async function stateMap(): Promise<{ fetched: Map<string, number>; failed: Map<string, number> }> {
  const fetched = new Map<string, number>();
  const failed = new Map<string, number>();
  if (hasDatabase()) {
    await ensureSchema();
    for (const r of await sql()`SELECT symbol, report, fetched_at FROM prowess_reports`) fetched.set(`${r.symbol}|${r.report}`, new Date(r.fetched_at as string).getTime());
    for (const r of await sql()`SELECT symbol, report, failed_at FROM prowess_errors`) failed.set(`${r.symbol}|${r.report}`, new Date(r.failed_at as string).getTime());
    return { fetched, failed };
  }
  try {
    for (const f of await readdir(DIR)) {
      const m = f.match(/^(.+)__(.+)\.json$/);
      if (!m) continue;
      const j = JSON.parse(await readFile(path.join(DIR, f), "utf8"));
      fetched.set(`${m[1]}|${m[2]}`, new Date(j.fetchedAt).getTime());
    }
  } catch {
    /* empty cache */
  }
  return { fetched, failed };
}

export async function coverage(): Promise<{ stored: number; failed: number }> {
  const { fetched, failed } = await stateMap();
  return { stored: fetched.size, failed: failed.size };
}
