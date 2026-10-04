#!/usr/bin/env tsx
/**
 * GitHub Actions runner — World Bank Data360 observations sync cron (moved off
 * Vercel: Fluid Active CPU over quota).
 *
 * Same work the Vercel route did in default mode (GET /api/cron/data360):
 * paginate observations for incomplete indicators (resumable, time-boxed).
 * The catalog mode stays manual via the route (and has its own weekly cron).
 * Calls the same lib functions the route calls — no HTTP, no auth headers.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-data360.ts
 */

import { hasDatabase } from "@/lib/db";
import { syncStatus, syncTrackedData } from "@/lib/data360/sync";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) {
    fail("DATABASE_URL/POSTGRES_URL is not set — the Data360 sync writes straight to Neon");
  }
  console.log(JSON.stringify({ level: "info", msg: "starting Data360 tracked-data sync" }));
  const t0 = Date.now();
  // Generous budget: resumable and time-boxed, so one runner run can make
  // real progress through the backlog within the 30-minute job timeout.
  const results = await syncTrackedData(600_000);
  const status = await syncStatus();
  console.log(
    JSON.stringify({
      level: "info",
      msg: "Data360 tracked-data sync done",
      ms: Date.now() - t0,
      indicatorsSynced: results.length,
      status,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
