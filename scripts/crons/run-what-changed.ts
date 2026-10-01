#!/usr/bin/env tsx
/**
 * GitHub Actions runner — "what changed" institutional-shifts warmer
 * (moved off Vercel: Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: force-rebuild the market-shifts payload
 * and persist it, so the home-page panel serves a warm cache.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-what-changed.ts
 */

import { getMarketShiftsCached } from "@/lib/feeds/what-changed/cache";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting what-changed rebuild" }));
  const t0 = Date.now();
  const payload = await getMarketShiftsCached(true);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "what-changed done",
      fetchedAt: payload.fetchedAt,
      slot: payload.slot,
      items: payload.items.length,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
