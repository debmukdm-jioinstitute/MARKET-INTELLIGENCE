#!/usr/bin/env tsx
/**
 * GitHub Actions runner — collector pipeline cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron's scheduled (full) run did: run ALL market-data
 * collectors with writes to Neon (no ?only subset, no ?dry=1 validation-only).
 * Subset/dry runs stay manual via the /api/cron/collect route.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-collect.ts
 */

import { hasDatabase } from "@/lib/db";
import { runCollectors } from "@/lib/collector/run";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set");
  console.log(JSON.stringify({ level: "info", msg: "starting collector run (full, writes enabled)" }));
  const t0 = Date.now();
  // Full scheduled run: no ?only subset, no ?dry validation-only (writes on).
  const results = await runCollectors(undefined, false);
  const okCount = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "collector run done",
      collectors: results.length,
      ok: okCount,
      failed: failed.length,
      failedCollectors: failed.slice(0, 20).map((r) => r.collector),
      ms: Date.now() - t0,
    }),
  );
  if (results.length > 0 && okCount === 0) {
    fail("all collectors failed", { sample: failed.slice(0, 3) });
  }
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
