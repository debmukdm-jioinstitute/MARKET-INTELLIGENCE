#!/usr/bin/env tsx
/**
 * GitHub Actions runner — 52-week high/low levels cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: refresh per-stock 52W high/low into
 * Neon. The refresh is resumable (skips symbols already fresh today), so the
 * budget is raised from the Vercel-era ~5 minutes to 20 minutes — on the
 * runner a single daily run can finish the whole universe instead of
 * leaving it for the next day.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-52w-levels.ts
 */

import { refreshWeek52Levels } from "@/lib/feeds/india/week52-levels";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting 52w levels refresh" }));
  const t0 = Date.now();
  const result = await refreshWeek52Levels(1_200_000);
  console.log(JSON.stringify({ level: "info", msg: "52w levels done", ms: Date.now() - t0, ...result }));
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
