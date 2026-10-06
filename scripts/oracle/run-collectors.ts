#!/usr/bin/env tsx
/**
 * Oracle Always Free: external-collector runner — DB-DIRECT rewrite of
 * scripts/collectors/run-collectors.ts (the GitHub Actions version).
 *
 * Same collectors (COLLECTORS from src/lib/collector/run), same --only=a,b
 * filter, same per-collector timeout semantics, same failure contract —
 * but ZERO HTTP:
 *   - Watermark delta-cursors come from readWatermark/readWatermarks in
 *     @/lib/collector/records (exactly what GET /api/collector/watermark
 *     calls) — here via the dbContext export — instead of fetching them from
 *     the site.
 *   - Results are validated with validateIngestBody and written with
 *     saveSeries / saveRecords / clearFailure / markFailure — the exact
 *     sequence POST /api/collector/ingest performs — instead of POSTing to
 *     the site. Per-collector ingest batches are preserved (a failure while
 *     saving one collector never discards the others).
 *
 * A failed collector contributes a FAILURE RECORD via markFailure — data rows
 * are NEVER fabricated. A series with zero usable observations is REJECTED
 * by validation (last-good data preserved), exactly as the ingest route does.
 *
 * No CRON_SECRET / SITE_URL needed anymore (no HTTP anywhere).
 * NOTE: the Actions version chained the twice-daily Telegram market-data
 * briefing (/api/cron/telegram-data-brief) after a successful run — that was
 * an HTTP call to the site and is NOT done here. Schedule the separate
 * telegram-data-brief job (another oracle runner) at 06:00/18:00 IST if the
 * briefing must stay on this box.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-collectors.ts [--only=amfi,rbi]
 *
 * Exits 0 when the ingest landed and at least one collector succeeded;
 * exits 1 when nothing could be delivered; exits 2 on bad args.
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; required)
 *   ONLY — fallback for --only (same as the Actions version)
 *   HF_TOKEN, APIFY_TOKEN, YOUTUBE_API_KEY, BLS_API_KEY, FEED_USER_AGENT,
 *   plus per-collector budget knobs (e.g. SHAREHOLDING_BUDGET_MS) — each
 *   collector degrades honestly without its key (see src/lib/collector/).
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */

import { hasDatabase } from "@/lib/db";
import { dbContext, saveRecords } from "@/lib/collector/records";
import { clearFailure, markFailure, saveSeries } from "@/lib/collector/store";
import { batchesOf, type SeriesResult } from "@/lib/collector/types";
import { shapeIngestPayload, validateIngestBody, type CollectorRun } from "@/lib/collector/ingest";
import { COLLECTORS } from "@/lib/collector/run";

const SCRIPT = "run-collectors";
const COLLECTOR_TIMEOUT_MS = 120_000;

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t!));
}

if (!hasDatabase()) {
  console.error(
    JSON.stringify({
      level: "warn",
      script: SCRIPT,
      msg: "DATABASE_URL / POSTGRES_URL / DATABASE_URL_UNPOOLED is not set — nothing to do",
    }),
  );
  process.exit(0);
}

async function main(): Promise<void> {
  const only = (arg("only") ?? process.env.ONLY ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const list = only.length ? COLLECTORS.filter((c) => only.includes(c.id)) : COLLECTORS; // runs everything, including actions-only collectors
  const unknown = only.filter((id) => !COLLECTORS.some((c) => c.id === id));
  if (unknown.length) {
    console.error(JSON.stringify({ level: "error", script: SCRIPT, msg: `unknown collector ids: ${unknown.join(",")}` }));
    process.exit(2);
  }
  console.log(JSON.stringify({ level: "info", script: SCRIPT, msg: "starting collectors (db-direct)", collectors: list.map((c) => c.id) }));

  const runs: CollectorRun[] = await Promise.all(
    list.map(async (c): Promise<CollectorRun> => {
      const t0 = Date.now();
      try {
        const results: SeriesResult[] = await withTimeout(c.run(dbContext), c.timeoutMs ?? COLLECTOR_TIMEOUT_MS, c.id);
        const usable = results.filter((r) => r.obs.length > 0).length;
        console.log(
          JSON.stringify({ level: "info", script: SCRIPT, msg: "collector done", collector: c.id, series: results.length, usable, ms: Date.now() - t0 }),
        );
        return { collector: c.id, results };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.log(JSON.stringify({ level: "warn", script: SCRIPT, msg: "collector failed", collector: c.id, error, ms: Date.now() - t0 }));
        return { collector: c.id, error };
      }
    }),
  );

  // Direct-DB ingest: the exact sequence POST /api/collector/ingest performs,
  // one collector at a time — a failure while saving one collector must not
  // discard the others' results.
  let points = 0;
  const savedIds: string[] = [];
  const records: { table: string; received: number; inserted: number; skipped: number }[] = [];
  const cleared: string[] = [];
  const recordedFailures: string[] = [];
  const rejected: { id: string; reason: string }[] = [];
  for (const run of runs) {
    const payload = shapeIngestPayload([run]);
    const { series, ok, failures, rejected: rej } = validateIngestBody(payload);
    rejected.push(...rej);
    console.log(
      JSON.stringify({ level: "info", script: SCRIPT, msg: "ingesting to db", collector: run.collector, series: series.length, failures: failures.map((f) => f.id) }),
    );
    for (const s of series) {
      try {
        points += await saveSeries(s);
        savedIds.push(s.id);
        for (const b of batchesOf(s)) {
          const r = await saveRecords(b);
          records.push({ table: b.table, received: b.rows.length, ...r });
        }
      } catch (e) {
        rejected.push({ id: s.id, reason: e instanceof Error ? e.message : "save failed" });
      }
    }
    for (const id of ok) {
      try {
        await clearFailure(id);
        cleared.push(id);
      } catch {
        /* failure bookkeeping must never fail the ingest */
      }
    }
    for (const f of failures) {
      try {
        await markFailure(`collector:${f.id}`, f.id, "", f.error);
        recordedFailures.push(f.id);
      } catch {
        /* failure bookkeeping must never fail the ingest */
      }
    }
  }

  // Same shape POST /api/collector/ingest returns, printed as the CLI's JSON summary.
  const succeeded = okCount(runs);
  console.log(
    JSON.stringify({
      ok: succeeded > 0,
      saved: { series: savedIds.length, points, ids: savedIds },
      records,
      cleared,
      recordedFailures,
      rejected,
    }),
  );

  if (succeeded === 0) {
    console.error(JSON.stringify({ level: "error", script: SCRIPT, msg: "all collectors failed — nothing fresh delivered" }));
    process.exit(1);
  }
  console.log(JSON.stringify({ level: "info", script: SCRIPT, msg: "done", succeeded, failed: runs.length - succeeded }));
}

/** Collectors whose run did not throw (mirrors shapeIngestPayload's ok list). */
function okCount(runs: CollectorRun[]): number {
  return shapeIngestPayload(runs).ok.length;
}

main().catch((e) => {
  console.error(
    JSON.stringify({
      level: "error",
      script: SCRIPT,
      msg: "runner crashed",
      error: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
});
