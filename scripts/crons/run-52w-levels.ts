#!/usr/bin/env tsx
/**
 * GitHub Actions runner — 52-week high/low levels cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the Vercel route did (GET /api/cron/52w-levels): refresh per-stock
 * 52W high/low from a year of Upstox daily candles into Neon. Resumable within
 * its time budget — the runner uses the same 280_000 ms budget the route used.
 * Calls the same lib function the route calls — no HTTP, no auth headers.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-52w-levels.ts
 */

import { hasDatabase } from "@/lib/db";
import { refreshWeek52Levels } from "@/lib/feeds/india/week52-levels";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) {
    fail("DATABASE_URL/POSTGRES_URL is not set — the 52w levels refresh writes straight to Neon");
  }
  console.log(JSON.stringify({ level: "info", msg: "starting 52w levels refresh", budgetMs: 280_000 }));
  const t0 = Date.now();
  const result = await refreshWeek52Levels(280_000);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "52w levels refresh done",
      ms: Date.now() - t0,
      universe: result.universe,
      alreadyFresh: result.alreadyFresh,
      updated: result.updated,
      failed: result.failed,
      remaining: result.remaining,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
