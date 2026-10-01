#!/usr/bin/env tsx
/**
 * GitHub Actions runner — weekly scanner backtest cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: backtest every scanner over ~2 years of
 * Nifty 500 daily bars and store the result. Budget raised from the
 * Vercel-era 50s to 10 minutes — the runner has no serverless time limit.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-backtest.ts
 */

import { runBacktest } from "@/lib/scanner/backtest";
import { saveBacktest } from "@/lib/scanner/store";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting backtest" }));
  const t0 = Date.now();
  const run = await runBacktest({ budgetMs: 600_000, concurrency: 16 });
  if (run.symbols < 300) {
    fail("too few symbols; keeping previous backtest", { symbols: run.symbols });
  }
  await saveBacktest(run);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "backtest done",
      symbols: run.symbols,
      from: run.from,
      to: run.to,
      sessions: run.sessions,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
