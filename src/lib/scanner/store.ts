import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasDatabase, sql } from "../db";
import type { ScanRun } from "./types";

/** Latest scan result — Postgres when configured, else a JSON file under `.scanner-cache/`. */
const FILE = path.join(process.cwd(), ".scanner-cache", "latest.json");
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

export async function saveScan(run: ScanRun): Promise<void> {
  if (hasDatabase()) {
    await ensureSchema();
    await sql()`INSERT INTO scan_latest (id, data, run_at) VALUES ('latest', ${JSON.stringify(run)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, run_at = now()`;
    return;
  }
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(run));
}

export async function loadScan(): Promise<ScanRun | null> {
  if (hasDatabase()) {
    await ensureSchema();
    const rows = await sql()`SELECT data FROM scan_latest WHERE id = 'latest'`;
    return (rows[0]?.data as ScanRun) ?? null;
  }
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as ScanRun;
  } catch {
    return null;
  }
}
