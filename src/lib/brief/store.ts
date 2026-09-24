import { hasDatabase, sql } from "@/lib/db";
import type { Brief } from "./types";

let ready: Promise<void> | null = null;

export function ensureBriefSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS daily_briefs (
        id bigserial PRIMARY KEY,
        kind text NOT NULL,
        generated_at timestamptz NOT NULL DEFAULT now(),
        engine text NOT NULL,
        payload jsonb NOT NULL,
        emailed_at timestamptz
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_daily_briefs_gen ON daily_briefs(generated_at DESC)`;
    // Opt-in only: nobody receives the brief by email unless they subscribe here.
    await db`
      CREATE TABLE IF NOT EXISTS brief_subscriptions (
        email text PRIMARY KEY,
        pre boolean NOT NULL DEFAULT true,
        post boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export async function saveBrief(b: Brief): Promise<number> {
  await ensureBriefSchema();
  const [row] = (await sql()`
    INSERT INTO daily_briefs (kind, engine, payload) VALUES (${b.kind}, ${b.engine}, ${JSON.stringify(b)}::jsonb) RETURNING id
  `) as { id: number }[];
  return Number(row.id);
}

export async function latestBriefs(limit = 6): Promise<(Brief & { id: number })[]> {
  if (!hasDatabase()) return [];
  try {
    await ensureBriefSchema();
    const rows = (await sql()`SELECT id, payload FROM daily_briefs ORDER BY generated_at DESC LIMIT ${limit}`) as { id: number; payload: Brief }[];
    return rows.map((r) => ({ ...r.payload, id: Number(r.id) }));
  } catch {
    return [];
  }
}

export async function markEmailed(id: number) {
  await sql()`UPDATE daily_briefs SET emailed_at = now() WHERE id = ${id}`;
}

export async function briefRecipients(kind: "pre" | "post"): Promise<string[]> {
  await ensureBriefSchema();
  const rows = (kind === "pre"
    ? await sql()`SELECT email FROM brief_subscriptions WHERE pre`
    : await sql()`SELECT email FROM brief_subscriptions WHERE post`) as { email: string }[];
  return rows.map((r) => r.email);
}

export async function getSubscription(email: string) {
  await ensureBriefSchema();
  const rows = (await sql()`SELECT pre, post FROM brief_subscriptions WHERE email = ${email}`) as { pre: boolean; post: boolean }[];
  return rows[0] ?? null;
}

export async function setSubscription(email: string, pre: boolean, post: boolean) {
  await ensureBriefSchema();
  if (!pre && !post) {
    await sql()`DELETE FROM brief_subscriptions WHERE email = ${email}`;
    return;
  }
  await sql()`
    INSERT INTO brief_subscriptions (email, pre, post) VALUES (${email}, ${pre}, ${post})
    ON CONFLICT (email) DO UPDATE SET pre = EXCLUDED.pre, post = EXCLUDED.post
  `;
}
