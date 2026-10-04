#!/usr/bin/env tsx
/**
 * GitHub Actions runner — Reddit sentiment refresher cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: run the shared Reddit sentiment cron
 * (force-refresh the first 10 watchlist bellwethers, prune cache rows older
 * than 60 days), writing straight to Neon.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *      HF_TOKEN (optional — the HF lib works without it).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-reddit-sentiment.ts
 */

import { hasDatabase } from "@/lib/db";
import { runRedditSentimentCron } from "@/lib/reddit-sentiment/cron";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set");
  console.log(JSON.stringify({ level: "info", msg: "starting reddit-sentiment refresh" }));
  const t0 = Date.now();
  const result = await runRedditSentimentCron();
  if (!result.ok) fail("reddit-sentiment cron failed", result.error);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "reddit-sentiment done",
      refreshedCount: result.refreshedCount,
      refreshed: result.refreshed,
      pruned: result.pruned,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
