#!/usr/bin/env tsx
/**
 * GitHub Actions runner — company-disclosures crawler cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: run the shared disclosure crawler
 * (scrape NSE announcements → FinBERT enrichment → idempotent upsert →
 * prune rows older than 90 days), writing straight to Neon.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *      HF_TOKEN (optional — the HF lib works without it).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-company-disclosures.ts
 */

import { hasDatabase } from "@/lib/db";
import { runDisclosureCrawler } from "@/lib/disclosures/crawler";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set");
  console.log(JSON.stringify({ level: "info", msg: "starting company-disclosures crawl" }));
  const t0 = Date.now();
  const result = await runDisclosureCrawler();
  if (!result.ok) fail("company-disclosures crawler failed", result.error);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "company-disclosures done",
      crawled: result.crawled,
      saved: result.saved,
      pruned: result.pruned,
      rows: result.meta.count,
      latestAt: result.meta.latestAt,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
