#!/usr/bin/env tsx
/**
 * GitHub Actions runner — World Bank Data360 catalog cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: refresh the dataset + indicator id
 * catalog once a week.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-data360-catalog.ts
 */

import { syncAllIndicatorCatalogs } from "@/lib/data360/sync";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting Data360 catalog refresh" }));
  const t0 = Date.now();
  const catalog = await syncAllIndicatorCatalogs();
  console.log(JSON.stringify({ level: "info", msg: "Data360 catalog done", ms: Date.now() - t0, catalog }));
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
