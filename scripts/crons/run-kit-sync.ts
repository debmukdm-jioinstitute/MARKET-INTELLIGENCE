#!/usr/bin/env tsx
/**
 * GitHub Actions runner — Kit `customers` tag sync cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: tag up to BATCH users that were never
 * successfully tagged (`kit_tagged_at IS NULL`). This backfills existing
 * users on the first runs, and afterwards only picks up signups the
 * signup-time hook missed. Tagging in Kit is idempotent, so re-runs are safe.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted),
 *      KIT_API_KEY (required — without it there is nothing to sync).
 *
 * IMPORTANT: KIT_API_KEY is currently NOT among the secrets available to
 * these workflows (only DATABASE_URL/CRON_SECRET/TELEGRAM_BOT_TOKEN/
 * TELEGRAM_CHAT_ID are configured). The runner fails fast with a clear
 * message until a KIT_API_KEY secret is provisioned; add it and pass it in
 * the workflow's env to enable this job.
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-kit-sync.ts
 */

import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { tagCustomerInKit } from "@/lib/kit";

const BATCH = 100;
const CONCURRENCY = 8;

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set");
  if (!process.env.KIT_API_KEY?.trim()) {
    fail(
      "KIT_API_KEY is not set — nothing to sync. Provision a KIT_API_KEY Actions secret " +
        "and pass it to the runner env to enable this job.",
    );
  }

  console.log(JSON.stringify({ level: "info", msg: "starting Kit customers sync" }));
  const t0 = Date.now();
  await ensureSchema();
  const db = sql();

  const rows = (await db`
    SELECT email, name FROM users
    WHERE kit_tagged_at IS NULL
    ORDER BY created_at ASC
    LIMIT ${BATCH}
  `) as Array<{ email: string; name: string | null }>;

  let tagged = 0;
  const failed: Array<{ email: string; error?: string }> = [];

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (u) => {
        const r = await tagCustomerInKit(u.email, u.name ?? undefined);
        if (r.ok) {
          try {
            await db`UPDATE users SET kit_tagged_at = now() WHERE email = ${u.email}`;
          } catch {
            /* marked on next run */
          }
          return { ok: true as const };
        }
        return { ok: false as const, email: u.email, error: r.error };
      }),
    );
    for (const r of results) {
      if (r.ok) tagged += 1;
      else failed.push({ email: r.email, error: r.error });
    }
  }

  const remaining = (await db`
    SELECT COUNT(*)::int AS c FROM users WHERE kit_tagged_at IS NULL
  `) as Array<{ c: number }>;

  console.log(
    JSON.stringify({
      level: "info",
      msg: "Kit sync done",
      processed: rows.length,
      tagged,
      failed: failed.length,
      failedEmails: failed.slice(0, 10).map((f) => f.email),
      remaining: remaining[0]?.c ?? 0,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
