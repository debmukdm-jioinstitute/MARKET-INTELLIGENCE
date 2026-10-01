#!/usr/bin/env tsx
/**
 * GitHub Actions runner — World Bank Data360 observation sync cron
 * (moved off Vercel: Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: paginate observations for incomplete
 * indicators (resumable). Budget raised from the Vercel-era ~55s to 10
 * minutes so one run makes real progress through the backlog.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-data360.ts
 */

import { syncTrackedData } from "@/lib/data360/sync";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting Data360 observation sync" }));
  const t0 = Date.now();
  const results = await syncTrackedData(600_000);
  console.log(JSON.stringify({ level: "info", msg: "Data360 sync done", ms: Date.now() - t0, results }));
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
