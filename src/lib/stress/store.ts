import { hasDatabase, sql } from "@/lib/db";
import type { StressResult } from "./compute";

let ready: Promise<void> | null = null;

export function ensureStressSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS stress_history (
        ts timestamptz PRIMARY KEY DEFAULT now(),
        score double precision NOT NULL,
        band text NOT NULL,
        convergence_score int NOT NULL,
        payload jsonb NOT NULL
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS convergence_alerts (
        id bigserial PRIMARY KEY,
        fired_at timestamptz NOT NULL DEFAULT now(),
        priority text NOT NULL,
        families text[] NOT NULL,
        score int NOT NULL,
        key text NOT NULL,
        snapshot jsonb NOT NULL,
        delivered_at timestamptz
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_conv_alerts_fired ON convergence_alerts(fired_at DESC)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export async function saveStress(r: StressResult): Promise<void> {
  if (r.score == null) return;
  await ensureStressSchema();
  await sql()`
    INSERT INTO stress_history (ts, score, band, convergence_score, payload)
    VALUES (now(), ${r.score}, ${r.band}, ${r.convergence.score}, ${JSON.stringify(r)}::jsonb)
  `;
}

export type StressPoint = { ts: string; score: number; convergence: number };

export async function stressHistory(days = 30): Promise<StressPoint[]> {
  if (!hasDatabase()) return [];
  try {
    await ensureStressSchema();
    const rows = (await sql()`
      SELECT ts, score, convergence_score FROM stress_history
      WHERE ts > now() - make_interval(days => ${days}) ORDER BY ts
    `) as { ts: Date | string; score: number; convergence_score: number }[];
    return rows.map((r) => ({ ts: new Date(r.ts).toISOString(), score: Number(r.score), convergence: Number(r.convergence_score) }));
  } catch {
    return [];
  }
}

export type AlertRow = { id: number; fired_at: string; priority: "high" | "critical"; families: string[]; score: number; snapshot: StressResult; delivered_at: string | null };

export async function recentAlerts(limit = 20): Promise<AlertRow[]> {
  if (!hasDatabase()) return [];
  try {
    await ensureStressSchema();
    return (await sql()`SELECT id, fired_at, priority, families, score, snapshot, delivered_at FROM convergence_alerts ORDER BY fired_at DESC LIMIT ${limit}`) as AlertRow[];
  } catch {
    return [];
  }
}

const COOLDOWN_HOURS = 12;
const MAX_PER_DAY = 4;

/**
 * Corroborated-alert gate: fires only for 3+ independent families, dedupes on the exact family set
 * within a cooldown (unless priority escalated), and caps alerts per day.
 */
export async function maybeFireAlert(r: StressResult): Promise<{ fired: boolean; reason: string; id?: number }> {
  const c = r.convergence;
  if (c.priority === "none") return { fired: false, reason: "no convergence" };
  await ensureStressSchema();
  const db = sql();
  const key = [...c.firing].sort().join("+");
  const [{ n }] = (await db`SELECT count(*)::int AS n FROM convergence_alerts WHERE fired_at > now() - interval '24 hours'`) as { n: number }[];
  if (n >= MAX_PER_DAY) return { fired: false, reason: "daily cap reached" };
  const last = (await db`
    SELECT priority FROM convergence_alerts
    WHERE key = ${key} AND fired_at > now() - make_interval(hours => ${COOLDOWN_HOURS}) ORDER BY fired_at DESC LIMIT 1
  `) as { priority: string }[];
  if (last.length && !(last[0].priority === "high" && c.priority === "critical")) return { fired: false, reason: "duplicate within cooldown" };
  const [row] = (await db`
    INSERT INTO convergence_alerts (priority, families, score, key, snapshot)
    VALUES (${c.priority}, ${c.firing}::text[], ${c.score}, ${key}, ${JSON.stringify(r)}::jsonb) RETURNING id
  `) as { id: number }[];
  return { fired: true, reason: "fired", id: Number(row.id) };
}
