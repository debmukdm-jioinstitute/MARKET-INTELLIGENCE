import { hasDatabase, sql } from "@/lib/db";

export type AppCacheRow<T> = { value: T; updatedAt: string };

let schemaReady: Promise<void> | null = null;

async function ensureAppCacheSchema(): Promise<void> {
  if (!hasDatabase()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS app_cache (
          key text PRIMARY KEY,
          value jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  await schemaReady;
}

/** Last persisted JSON for key — no TTL; used for landing/dashboard fallbacks. */
export async function readAppCache<T>(key: string): Promise<AppCacheRow<T> | null> {
  if (!hasDatabase()) return null;
  try {
    await ensureAppCacheSchema();
    const rows = await sql()`
      SELECT value, updated_at::text AS updated_at
      FROM app_cache
      WHERE key = ${key}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row?.value) return null;
    return { value: row.value as T, updatedAt: String(row.updated_at) };
  } catch {
    return null;
  }
}

export async function writeAppCache(key: string, value: unknown): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await ensureAppCacheSchema();
    await sql()`
      INSERT INTO app_cache (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  } catch {
    /* non-fatal */
  }
}
