#!/usr/bin/env tsx
/**
 * GitHub Actions runner — data.gov.in sync cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: sync rows for the tracked datasets
 * (resumable, time-boxed). Catalog/discover modes stay manual via the route.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted),
 *      DATA_GOV_IN_API_KEY (optional — falls back to the sample key).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-datagov.ts
 */

import { syncTracked } from "@/lib/datagov/sync";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting data.gov.in sync" }));
  const t0 = Date.now();
  // Generous budget: the runner has no serverless time limit, so one run can
  // work through the backlog instead of leaving it for tomorrow.
  const results = await syncTracked(600_000);
  console.log(JSON.stringify({ level: "info", msg: "data.gov.in sync done", ms: Date.now() - t0, results }));
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
