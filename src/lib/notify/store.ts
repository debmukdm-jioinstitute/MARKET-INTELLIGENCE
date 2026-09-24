import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasDatabase, sql } from "../db";
import type { NewEvent, SiteEvent } from "./types";

/**
 * Event feed + detector state. Postgres (Neon) when configured, otherwise JSON files under `.notify-cache/` so local
 * development works without a database.
 */
const DIR = path.join(process.cwd(), ".notify-cache");
const MAX_FILE_EVENTS = 300;
let ready: Promise<void> | null = null;

function ensureSchema() {
  ready ??= (async () => {
    const db = sql();
    await db`CREATE TABLE IF NOT EXISTS site_events (
      id bigserial PRIMARY KEY,
      key text NOT NULL UNIQUE,
      at timestamptz NOT NULL DEFAULT now(),
      category text NOT NULL,
      severity text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      href text NOT NULL
    )`;
    await db`CREATE INDEX IF NOT EXISTS idx_site_events_at ON site_events (at DESC)`;
    await db`CREATE TABLE IF NOT EXISTS notify_state (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(name: string, data: unknown) {
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, name), JSON.stringify(data));
}

/** Insert new events; an event whose `key` already exists is ignored. Returns how many were new. */
export async function addEvents(events: NewEvent[]): Promise<number> {
  if (!events.length) return 0;
  if (hasDatabase()) {
    await ensureSchema();
    let added = 0;
    for (const e of events) {
      const r = await sql()`INSERT INTO site_events (key, category, severity, title, body, href)
        VALUES (${e.key}, ${e.category}, ${e.severity}, ${e.title}, ${e.body}, ${e.href}) ON CONFLICT (key) DO NOTHING RETURNING id`;
      added += r.length;
    }
    return added;
  }
  const all = await readJson<(SiteEvent & { key: string })[]>("events.json", []);
  const have = new Set(all.map((x) => x.key));
  let added = 0;
  for (const e of events) {
    if (have.has(e.key)) continue;
    have.add(e.key);
    all.unshift({ ...e, id: `${Date.now()}-${added}`, at: new Date().toISOString() });
    added++;
  }
  await writeJson("events.json", all.slice(0, MAX_FILE_EVENTS));
  return added;
}

/** Newest first. */
export async function listEvents(limit = 60): Promise<SiteEvent[]> {
  if (hasDatabase()) {
    await ensureSchema();
    const rows = await sql()`SELECT id, at, category, severity, title, body, href FROM site_events ORDER BY at DESC, id DESC LIMIT ${limit}`;
    return rows.map((r) => ({ id: String(r.id), at: new Date(r.at as string).toISOString(), category: r.category, severity: r.severity, title: r.title, body: r.body, href: r.href }) as SiteEvent);
  }
  const all = await readJson<SiteEvent[]>("events.json", []);
  return all.slice(0, limit).map(({ id, at, category, severity, title, body, href }) => ({ id, at, category, severity, title, body, href }));
}

export async function getState<T>(key: string): Promise<T | null> {
  if (hasDatabase()) {
    await ensureSchema();
    const r = await sql()`SELECT value FROM notify_state WHERE key = ${key}`;
    return (r[0]?.value as T) ?? null;
  }
  return (await readJson<Record<string, T>>("state.json", {}))[key] ?? null;
}

export async function setState(key: string, value: unknown): Promise<void> {
  if (hasDatabase()) {
    await ensureSchema();
    await sql()`INSERT INTO notify_state (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    return;
  }
  const s = await readJson<Record<string, unknown>>("state.json", {});
  s[key] = value;
  await writeJson("state.json", s);
}

/** Claim a throttled job: true for at most one caller per `minMs` window (so many visitors don't all run detection). */
export async function claimRun(name: string, minMs: number): Promise<boolean> {
  if (hasDatabase()) {
    await ensureSchema();
    const secs = Math.max(1, Math.round(minMs / 1000));
    const r = await sql()`INSERT INTO notify_state (key, value, updated_at) VALUES (${`run:${name}`}, '{}'::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET updated_at = now()
      WHERE notify_state.updated_at < now() - make_interval(secs => ${secs}) RETURNING key`;
    return r.length > 0;
  }
  const s = await readJson<Record<string, number>>("runs.json", {});
  if (Date.now() - (s[name] ?? 0) < minMs) return false;
  s[name] = Date.now();
  await writeJson("runs.json", s);
  return true;
}
