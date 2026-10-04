#!/usr/bin/env tsx
/**
 * GitHub Actions runner — AI signals cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron (src/app/api/cron/signals/route.ts) did for
 * the scheduled run: the Nifty next-day/5-day model with walk-forward
 * validation plus Nifty 500 BTST/STBT candidates, then save the run — or, when
 * coverage is thin, merge just the F&O indices into the previous run so a bad
 * session never wipes a good signals table. No HTTP, no auth headers.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-signals.ts
 */

import { hasDatabase } from "@/lib/db";
import { mergeFnoIntoRun } from "@/lib/scanner/fno-index-model";
import { runSignals } from "@/lib/scanner/signals";
import { loadSignals, saveSignals } from "@/lib/scanner/store";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting signals run" }));
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set; nothing to persist to");
  const t0 = Date.now();
  const run = await runSignals({ symbols: undefined, indicesOnly: false });
  if (!run) fail("nifty data unavailable");

  const prev = await loadSignals().catch(() => null);
  let saved: "full" | "merged-fno";
  if (run.stocks.scanned >= run.stocks.universe * 0.6) {
    await saveSignals(run);
    saved = "full";
  } else {
    // Thin coverage: keep the previous stock picks, refresh only the indices.
    await saveSignals(mergeFnoIntoRun(prev, { indices: run.indices, lastBar: run.lastBar, nifty: run.nifty }));
    saved = "merged-fno";
  }
  console.log(
    JSON.stringify({
      level: "info",
      msg: "signals done",
      saved,
      scanned: run.stocks.scanned,
      universe: run.stocks.universe,
      btst: run.stocks.btst.length,
      stbt: run.stocks.stbt.length,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
