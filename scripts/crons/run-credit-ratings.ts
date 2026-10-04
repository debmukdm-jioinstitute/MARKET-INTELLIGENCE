#!/usr/bin/env tsx
/**
 * GitHub Actions runner — credit-ratings cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron (src/app/api/cron/credit-ratings/route.ts)
 * did: deep-fetch the credit-rating feed (RSS + crawl when keys are set) and
 * persist new items straight to Neon. No HTTP, no auth headers.
 *
 * NOTE: the Vercel route also calls setCreditFeedSnapshot() to warm an
 * in-memory feed cache — that call is deliberately skipped here; an in-memory
 * cache is meaningless in a one-shot runner process. Persistence is what
 * matters, and it is replicated below.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-credit-ratings.ts
 */

import { hasDatabase } from "@/lib/db";
import { fetchCreditRatingFeed } from "@/lib/credit/fetch-feed";
import { persistCreditFeedItems } from "@/lib/credit/persist";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting credit-ratings feed" }));
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set; nothing to persist to");
  const t0 = Date.now();
  const snapshot = await fetchCreditRatingFeed({ deep: true });
  if (snapshot.items.length) await persistCreditFeedItems(snapshot.items);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "credit-ratings done",
      ok: snapshot.dataStatus === "AVAILABLE",
      count: snapshot.items.length,
      collectorsUsed: snapshot.collectorsUsed,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
