#!/usr/bin/env tsx
/**
 * GitHub Actions runner — daily scanner cron (moved off Vercel:
 * Fluid Active CPU over quota).
 *
 * Same work the old Vercel cron (src/app/api/cron/scan/route.ts) did for the
 * scheduled run: scan the Nifty 500 with every scanner, save the result, and
 * send the Telegram digest (only when TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID are set). No HTTP, no auth headers.
 *
 * Guard: a partial run (timeout / Yahoo throttling) that covers less than
 * 60% of the universe must NOT overwrite a good full scan — the runner fails
 * loudly instead, keeping the previous result.
 *
 * Env: DATABASE_URL (Neon; POSTGRES_URL also accepted),
 *      TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (optional — digest skipped when unset).
 *
 * Usage (run from the repo root):
 *   npx --yes tsx@4 scripts/crons/run-scan.ts
 */

import { hasDatabase } from "@/lib/db";
import { runScan } from "@/lib/scanner/engine";
import { saveScan } from "@/lib/scanner/store";
import { sendTelegramDigest } from "@/lib/scanner/telegram-digest";

function fail(msg: string, extra?: unknown): never {
  console.error(JSON.stringify({ level: "error", msg, extra: extra ?? null }));
  process.exit(1);
}

async function main() {
  console.log(JSON.stringify({ level: "info", msg: "starting scanner run" }));
  if (!hasDatabase()) fail("DATABASE_URL / POSTGRES_URL is not set; nothing to persist to");
  const t0 = Date.now();
  const run = await runScan({});
  if (run.scanned < run.universe * 0.6) {
    fail("too few symbols scanned; keeping previous result", { scanned: run.scanned, universe: run.universe });
  }
  await saveScan(run);
  const telegram = await sendTelegramDigest(run);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "scan done",
      lastBar: run.lastBar,
      scanned: run.scanned,
      failed: run.failed,
      matches: Object.fromEntries(Object.entries(run.scanners).map(([k, v]) => [k, v.length])),
      telegram,
      ms: Date.now() - t0,
    }),
  );
}

main().catch((e) => fail("runner crashed", e instanceof Error ? e.message : String(e)));
