#!/usr/bin/env tsx
/**
 * GitHub Actions runner — market scanner cron (moved off Vercel: Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron did: scan the Nifty 500 with every scanner,
 * save the run to Neon, and send the optional Telegram digest. The budget is
 * raised from the Vercel-era 50s (tuned for serverless maxDuration) to 10
 * minutes — the runner has no such limit, so scans complete instead of
 * timing out partway.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted),
 *      TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (optional — digest is best-effort).
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/crons/run-scan.ts
 */

import { runScan } from "@/lib/scanner/engine";
import { saveScan } from "@/lib/scanner/store";
import { sendTelegramDigest } from "@/lib/scanner/telegram";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting market scan" }));
  const t0 = Date.now();
  const run = await runScan({ budgetMs: 600_000, concurrency: 16 });
  // A partial run (timeout / Yahoo throttling) must not overwrite a good full scan.
  if (run.scanned < run.universe * 0.6) {
    fail("too few symbols scanned; keeping previous result", { scanned: run.scanned, universe: run.universe });
  }
  await saveScan(run);
  const telegram = await sendTelegramDigest(run).catch(() => false);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "scan done",
      scanned: run.scanned,
      universe: run.universe,
      failed: run.failed,
      ms: Date.now() - t0,
      telegram,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
