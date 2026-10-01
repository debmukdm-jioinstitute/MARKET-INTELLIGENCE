#!/usr/bin/env tsx
/**
 * GitHub Actions runner — NSE instrument master sync cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: sync the NSE instrument master into
 * Neon once a week (powers portfolio symbol search / mapping).
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-instruments-sync.ts
 */

import { syncNseInstruments } from "@/lib/my-portfolio/nse-instruments-sync";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting NSE instruments sync" }));
  const t0 = Date.now();
  const result = await syncNseInstruments();
  console.log(JSON.stringify({ level: "info", msg: "instruments sync done", ms: Date.now() - t0, ...result }));
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
