#!/usr/bin/env tsx
/**
 * GitHub Actions runner — research scraper cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: scrape all research sources into Neon.
 * Intra-day freshness still comes from the stale-while-revalidate check in
 * /api/research-reports; this run is the guaranteed daily baseline.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-scrape-research.ts
 */

import { scrapeAllResearchSources } from "@/lib/research/scrape";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting research scrape" }));
  const t0 = Date.now();
  const results = await scrapeAllResearchSources();
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "research scrape done",
      sources: results.length,
      failed: failed.length,
      failedSources: failed.slice(0, 10).map((r) => r.source),
      ms: Date.now() - t0,
    }),
  );
  if (failed.length === results.length && results.length > 0) {
    fail("all research sources failed", { sample: failed.slice(0, 3) });
  }
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
