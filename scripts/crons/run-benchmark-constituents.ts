#!/usr/bin/env tsx
/**
 * GitHub Actions runner — benchmark constituent weights cron (moved off
 * Vercel: Fluid Active CPU over quota).
 *
 * Same work the Vercel route did (GET /api/cron/benchmark-constituents with no
 * ?only param): refresh NSE index constituent weights (archives CSV + Yahoo
 * cap proxy) for every India benchmark. Calls the same lib function the route
 * calls — no HTTP, no auth headers. The ?only=<id> single-index mode stays
 * manual via the route.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-benchmark-constituents.ts
 */

import { hasDatabase } from "@/lib/db";
import { refreshAllIndiaBenchmarkWeights } from "@/lib/my-portfolio/refresh-benchmark-weights";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) {
    fail("DATABASE_URL/POSTGRES_URL is not set — the benchmark weights refresh writes straight to Neon");
  }
  console.log(JSON.stringify({ level: "info", msg: "starting benchmark constituents refresh" }));
  const t0 = Date.now();
  const results = await refreshAllIndiaBenchmarkWeights();
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "benchmark constituents refresh done",
      ms: Date.now() - t0,
      benchmarks: results.length,
      ok,
      failedCount: failed.length,
      failedBenchmarks: failed.map((r) => r.benchmark),
    }),
  );
  if (ok === 0) fail("all benchmarks failed", failed.map((r) => ({ benchmark: r.benchmark, error: r.error })));
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
