#!/usr/bin/env tsx
/**
 * GitHub Actions runner — options-flow data agent cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron (src/app/api/cron/options-flow/route.ts) did:
 * run the data agent for the full NSE F&O universe (~210 names, 10-way
 * concurrent) and save each snapshot, so a 30-day baseline accumulates for
 * every optionable ticker even on days nobody opens the screener.
 * No HTTP, no auth headers.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-options-flow.ts
 */

import { hasDatabase } from "@/lib/db";
import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { runDataAgentAndSave } from "@/lib/options-flow/run";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting options-flow data agent" }));
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set; nothing to persist to");
  const t0 = Date.now();
  const universe = await listFoUniverse();
  const results = await runDataAgentAndSave(universe.map((i) => i.symbol));
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "options-flow done",
      total: results.length,
      failed: failed.length,
      failedSymbols: failed.slice(0, 10).map((r) => r.symbol),
      ms: Date.now() - t0,
    }),
  );
  if (failed.length === results.length && results.length > 0) {
    fail("all symbols failed", { sample: failed.slice(0, 3).map((r) => ({ symbol: r.symbol, error: r.error })) });
  }
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
