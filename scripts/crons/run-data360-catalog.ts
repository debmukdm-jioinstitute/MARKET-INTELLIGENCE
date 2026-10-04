#!/usr/bin/env tsx
/**
 * GitHub Actions runner — World Bank Data360 catalog refresh cron (moved off
 * Vercel: Fluid Active CPU over quota).
 *
 * Same work the Vercel route did (GET /api/cron/data360/catalog): weekly
 * refresh of the Data360 dataset + indicator id catalog. Calls the same lib
 * functions the route calls — no HTTP, no auth headers.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-data360-catalog.ts
 */

import { hasDatabase } from "@/lib/db";
import { syncAllIndicatorCatalogs, syncStatus } from "@/lib/data360/sync";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) {
    fail("DATABASE_URL/POSTGRES_URL is not set — the Data360 catalog refresh writes straight to Neon");
  }
  console.log(JSON.stringify({ level: "info", msg: "starting Data360 catalog refresh" }));
  const t0 = Date.now();
  const catalog = await syncAllIndicatorCatalogs();
  const status = await syncStatus();
  console.log(
    JSON.stringify({
      level: "info",
      msg: "Data360 catalog refresh done",
      ms: Date.now() - t0,
      catalog,
      status,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
