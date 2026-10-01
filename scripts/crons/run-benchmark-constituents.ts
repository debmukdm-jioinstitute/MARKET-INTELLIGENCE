#!/usr/bin/env tsx
/**
 * GitHub Actions runner — benchmark constituents cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: refresh NSE index constituent weights
 * (archives CSV + Yahoo cap proxy) for the portfolio Brinson / active-share
 * math.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-benchmark-constituents.ts
 */

import { refreshAllIndiaBenchmarkWeights } from "@/lib/my-portfolio/refresh-benchmark-weights";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting benchmark constituents refresh" }));
  const t0 = Date.now();
  const results = await refreshAllIndiaBenchmarkWeights();
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "benchmark constituents done",
      benchmarks: results.length,
      failed: failed.length,
      ms: Date.now() - t0,
    }),
  );
  if (failed.length === results.length && results.length > 0) {
    fail("all benchmarks failed", { sample: failed.slice(0, 3) });
  }
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
