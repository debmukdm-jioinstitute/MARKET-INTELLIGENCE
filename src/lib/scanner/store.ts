import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasDatabase, sql } from "../db";
import type { BacktestRun, ScanRun, SignalsRun } from "./types";

/** Latest scan and backtest results — Postgres when configured, else a JSON file under `.scanner-cache/`. */
const DIR = path.join(process.cwd(), ".scanner-cache");
let ready: Promise<void> | null = null;

function ensureSchema() {
  ready ??= (async () => {
    await sql()`CREATE TABLE IF NOT EXISTS scan_latest (id text PRIMARY KEY, data jsonb NOT NULL, run_at timestamptz NOT NULL DEFAULT now())`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

async function save(id: string, data: unknown): Promise<void> {
  if (hasDatabase()) {
    await ensureSchema();
    await sql()`INSERT INTO scan_latest (id, data, run_at) VALUES (${id}, ${JSON.stringify(data)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, run_at = now()`;
    return;
  }
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${id}.json`), JSON.stringify(data));
}

async function load<T>(id: string): Promise<T | null> {
  if (hasDatabase()) {
    await ensureSchema();
    const rows = await sql()`SELECT data FROM scan_latest WHERE id = ${id}`;
    return (rows[0]?.data as T) ?? null;
  }
  try {
    return JSON.parse(await readFile(path.join(DIR, `${id}.json`), "utf8")) as T;
  } catch {
    return null;
  }
}

export const saveScan = (run: ScanRun) => save("latest", run);
export const loadScan = () => load<ScanRun>("latest");
export const saveBacktest = (run: BacktestRun) => save("backtest", run);
export const loadBacktest = () => load<BacktestRun>("backtest");
export const saveSignals = (run: SignalsRun) => save("signals", run);
export const loadSignals = () => load<SignalsRun>("signals");
