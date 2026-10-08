#!/usr/bin/env tsx
/**
 * GitHub Actions runner — promoter-disclosures cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron (src/app/api/cron/promoter-disclosures/route.ts)
 * did: deep-fetch the promoter-disclosure feed and persist new items straight
 * to Neon. No HTTP, no auth headers.
 *
 * NOTE: the Vercel route also calls setPromoterFeedSnapshot() to warm an
 * in-memory feed cache — that call is deliberately skipped here; an in-memory
 * cache is meaningless in a one-shot runner process. Persistence is what
 * matters, and it is replicated below.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-promoter-disclosures.ts
 */

import { hasDatabase } from "@/lib/db";
import { fetchPromoterDisclosureFeed } from "@/lib/promoters/fetch-feed";
import { persistPromoterFeedItems } from "@/lib/promoters/persist";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting promoter-disclosures feed" }));
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set; nothing to persist to");
  const t0 = Date.now();
  const snapshot = await fetchPromoterDisclosureFeed({ deep: true });
  if (snapshot.items.length) await persistPromoterFeedItems(snapshot.items);
  // Fail the run (-> red in Actions) when the official NSE source produced nothing, so a silent
  // breakage can't hide behind news-RSS rows.
  if (!snapshot.collectorsUsed.includes("nse-api")) {
    fail("NSE API returned no items — collector degraded to news RSS only", { collectorsUsed: snapshot.collectorsUsed });
  }
  console.log(
    JSON.stringify({
      level: "info",
      msg: "promoter-disclosures done",
      ok: snapshot.dataStatus === "AVAILABLE",
      count: snapshot.items.length,
      collectorsUsed: snapshot.collectorsUsed,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
