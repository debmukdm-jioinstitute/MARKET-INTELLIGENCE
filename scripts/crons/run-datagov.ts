#!/usr/bin/env tsx
/**
 * GitHub Actions runner — data.gov.in tracked-datasets sync cron (moved off
 * Vercel: Fluid Active CPU over quota).
 *
 * Same work the Vercel route did in default mode
 * (GET /api/cron/datagov): sync rows for the tracked datasets (resumable,
 * time-boxed). The catalog/discover modes stay manual via the route.
 * Calls the same lib function the route calls — no HTTP, no auth headers.
 *
 * Like the route (which returns 503 without a key), the runner exits 1 when
 * DATA_GOV_IN_API_KEY is unset or is the sample key — row sync genuinely
 * needs a personal key and the runner does not fake it.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted),
 *      DATA_GOV_IN_API_KEY (personal key — required for row sync).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-datagov.ts
 */

import { hasDatabase } from "@/lib/db";
import { hasPersonalKey } from "@/lib/datagov/client";
import { syncTracked } from "@/lib/datagov/sync";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  if (!hasDatabase()) {
    fail("DATABASE_URL/POSTGRES_URL is not set — the data.gov.in sync writes straight to Neon");
  }
  if (!hasPersonalKey()) {
    fail(
      "DATA_GOV_IN_API_KEY is not set (or is the sample key) — data.gov.in row sync needs a personal API key. " +
        "Configure it in the repo's Actions secrets/variables; do not run row sync against the sample key.",
    );
  }
  console.log(JSON.stringify({ level: "info", msg: "starting data.gov.in tracked sync" }));
  const t0 = Date.now();
  // Generous budget: the runner has no serverless time limit, so one run can
  // work through the backlog instead of leaving it for tomorrow.
  const results = await syncTracked(600_000);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "data.gov.in sync done",
      ms: Date.now() - t0,
      datasetsSynced: results.length,
      results,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
