/**
 * Smart notifications — schema.
 *
 * Extends the existing `site_events` table (see src/lib/notify/store.ts) with
 * scoring columns and adds per-user preference + interaction tables. All
 * statements are idempotent; safe to run on every boot.
 */
import { hasDatabase, sql } from "@/lib/db";

let ready: Promise<void> | null = null;

export function ensureSmartSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    // Extend the existing events table with smart columns (keeps the old bell feed working).
    await db`ALTER TABLE site_events ADD COLUMN IF NOT EXISTS importance numeric NOT NULL DEFAULT 50`;
    await db`ALTER TABLE site_events ADD COLUMN IF NOT EXISTS symbol text`;
    await db`ALTER TABLE site_events ADD COLUMN IF NOT EXISTS why text NOT NULL DEFAULT ''`;
    await db`ALTER TABLE site_events ADD COLUMN IF NOT EXISTS source_url text`;
    await db`CREATE INDEX IF NOT EXISTS idx_site_events_symbol ON site_events(symbol)`;

    await db`
      CREATE TABLE IF NOT EXISTS notification_prefs (
        user_email text PRIMARY KEY,
        frequency text NOT NULL DEFAULT 'important' CHECK (frequency IN ('all', 'important', 'digest')),
        muted_categories text[] NOT NULL DEFAULT '{}',
        quiet_start int NOT NULL DEFAULT 22,
        quiet_end int NOT NULL DEFAULT 8,
        max_push_per_day int NOT NULL DEFAULT 3,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS notification_interactions (
        id bigserial PRIMARY KEY,
        user_email text NOT NULL,
        event_id bigint NOT NULL REFERENCES site_events(id) ON DELETE CASCADE,
        action text NOT NULL CHECK (action IN ('shown', 'clicked', 'dismissed', 'pushed')),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_notif_inter_user ON notification_interactions(user_email)`;
    await db`CREATE INDEX IF NOT EXISTS idx_notif_inter_event ON notification_interactions(event_id)`;
    // One interaction per (user, event, action) — keeps CTR math honest across repeated delivery runs.
    await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_inter_unique ON notification_interactions(user_email, event_id, action)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export interface SmartEventRow {
  id: number;
  key: string;
  at: string;
  category: string;
  severity: string;
  importance: number;
  symbol: string | null;
  title: string;
  body: string;
  href: string;
  why: string;
  source_url: string | null;
}

/** Insert smart events; existing keys are ignored (idempotent). Returns the newly added rows. */
export async function upsertSmartEvents(
  events: Array<{
    key: string;
    category: string;
    severity: "high" | "medium" | "info";
    importance: number;
    symbol?: string | null;
    title: string;
    body: string;
    href: string;
    why: string;
    source_url?: string | null;
  }>,
): Promise<SmartEventRow[]> {
  if (!events.length || !hasDatabase()) return [];
  await ensureSmartSchema();
  const db = sql();
  const added: SmartEventRow[] = [];
  for (const e of events) {
    const rows = (await db`
      INSERT INTO site_events (key, category, severity, importance, symbol, title, body, href, why, source_url)
      VALUES (${e.key}, ${e.category}, ${e.severity}, ${e.importance}, ${e.symbol ?? null},
              ${e.title}, ${e.body}, ${e.href}, ${e.why}, ${e.source_url ?? null})
      ON CONFLICT (key) DO NOTHING
      RETURNING id, key, at, category, severity, importance, symbol, title, body, href, why, source_url
    `) as SmartEventRow[];
    if (rows.length) added.push(rows[0]!);
  }
  return added;
}

/** Ranked smart events, newest first, with optional per-user rank already applied by the caller. */
export async function listSmartEvents(limit = 60): Promise<SmartEventRow[]> {
  if (!hasDatabase()) return [];
  await ensureSmartSchema();
  const db = sql();
  return (await db`
    SELECT id, key, at, category, severity, importance, symbol, title, body, href, why, source_url
    FROM site_events
    WHERE why <> '' AND at > now() - interval '7 days'
    ORDER BY importance DESC, at DESC
    LIMIT ${limit}
  `) as SmartEventRow[];
}
