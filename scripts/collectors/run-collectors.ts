#!/usr/bin/env tsx
/**
 * GitHub Actions collector runner — Phase 3: the free Apify replacement.
 *
 * Runs the FETCH half of the collectors in src/lib/collector (the same code
 * the Vercel /api/cron/collect route uses) inside the Actions runner, where
 * generous timeouts and a full Node runtime apply, then POSTs the results to
 * POST /api/collector/ingest. This script NEVER touches the database
 * directly and NEVER invents data: a failed collector contributes a failure
 * record (visible at GET /api/collector), never fabricated rows.
 *
 * Usage (run from the repo root):
 *   npx tsx scripts/collectors/run-collectors.ts [--only=amfi,rbi]
 *     [--ingest-url=https://getmarketintelligence.in/api/collector/ingest]
 *     [--secret=$CRON_SECRET]
 *
 * Env fallbacks: ONLY, SITE_URL (ingest defaults to $SITE_URL/api/collector/ingest),
 * CRON_SECRET. Exits 0 when the ingest POST landed and at least one collector
 * succeeded; exits 1 when nothing could be delivered.
 */

import { feedFetch } from "@/lib/feeds/http";
import { shapeIngestPayload, type CollectorRun } from "@/lib/collector/ingest";
import { COLLECTORS } from "@/lib/collector/run";
import type { CollectorContext, SeriesResult } from "@/lib/collector/types";

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

/** Delta cursors from the site (never the DB directly). Unreachable → empty → full window; unique keys still dedup. */
function httpContext(site: string, secret: string): CollectorContext {
  const get = async (qs: string): Promise<Record<string, unknown> | null> => {
    try {
      const res = await feedFetch(`${site}/api/collector/watermark?${qs}`, { headers: { authorization: `Bearer ${secret}` }, timeoutMs: 15_000, attempts: 2 });
      return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  return {
    watermark: async (id) => {
      const j = await get(`id=${encodeURIComponent(id)}`);
      return typeof j?.watermark === "string" ? j.watermark : null;
    },
    watermarks: async (prefix) => {
      const j = await get(`prefix=${encodeURIComponent(prefix)}`);
      return (j?.watermarks as Record<string, string> | undefined) ?? {};
    },
  };
}

async function main() {
  const only = (arg("only") ?? process.env.ONLY ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const site = (process.env.SITE_URL ?? "https://getmarketintelligence.in").replace(/\/$/, "");
  const ingestUrl = arg("ingest-url") ?? `${site}/api/collector/ingest`;
  const secret = arg("secret") ?? process.env.CRON_SECRET;
  if (!secret) {
    console.error(JSON.stringify({ level: "error", msg: "CRON_SECRET is not set — refusing to run without ingest auth" }));
    process.exit(2);
  }

  const ctx = httpContext(site, secret);
  const list = only.length ? COLLECTORS.filter((c) => only.includes(c.id)) : COLLECTORS; // Actions runner runs everything, including actions-only collectors
  const unknown = only.filter((id) => !COLLECTORS.some((c) => c.id === id));
  if (unknown.length) {
    console.error(JSON.stringify({ level: "error", msg: `unknown collector ids: ${unknown.join(",")}` }));
    process.exit(2);
  }
  console.log(JSON.stringify({ level: "info", msg: "starting collectors", collectors: list.map((c) => c.id), ingestUrl }));

  const runs: CollectorRun[] = await Promise.all(
    list.map(async (c): Promise<CollectorRun> => {
      const t0 = Date.now();
      try {
        const results: SeriesResult[] = await withTimeout(c.run(ctx), c.timeoutMs ?? COLLECTOR_TIMEOUT_MS, c.id);
        const usable = results.filter((r) => r.obs.length > 0).length;
        console.log(
          JSON.stringify({ level: "info", msg: "collector done", collector: c.id, series: results.length, usable, ms: Date.now() - t0 }),
        );
        return { collector: c.id, results };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.log(JSON.stringify({ level: "warn", msg: "collector failed", collector: c.id, error, ms: Date.now() - t0 }));
        return { collector: c.id, error };
      }
    }),
  );

  const payload = shapeIngestPayload(runs);
  console.log(
    JSON.stringify({
      level: "info",
      msg: "posting to ingest",
      series: payload.series.length,
      ok: payload.ok,
      failures: payload.failures.map((f) => f.id),
    }),
  );

  let res: Response;
  try {
    res = await feedFetch(ingestUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify(payload),
      timeoutMs: 30_000,
      attempts: 3,
    });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "ingest POST failed", error: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  }
  const text = await res.text().catch(() => "");
  console.log(JSON.stringify({ level: "info", msg: "ingest response", status: res.status, body: text.slice(0, 2000) }));
  if (!res.ok) process.exit(1);

  // Twice-daily Telegram market-data briefing (06:00 + 18:00 IST, right after
  // this collector run). Best-effort: a briefing failure must not fail the
  // collector run. The endpoint dedups per AM/PM slot, so manual re-runs and
  // --only subset runs never double-send. (Vercel Hobby only allows
  // once-daily crons, so the briefing is triggered here on free GitHub
  // Actions instead of vercel.json.)
  try {
    const briefRes = await feedFetch(`${site}/api/cron/telegram-data-brief`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      timeoutMs: 60_000,
      attempts: 2,
    });
    const briefText = await briefRes.text().catch(() => "");
    console.log(
      JSON.stringify({ level: "info", msg: "telegram briefing", status: briefRes.status, body: briefText.slice(0, 500) }),
    );
  } catch (e) {
    console.log(
      JSON.stringify({ level: "warn", msg: "telegram briefing failed (non-fatal)", error: e instanceof Error ? e.message : String(e) }),
    );
  }

  if (payload.ok.length === 0) {
    console.error(JSON.stringify({ level: "error", msg: "all collectors failed — nothing fresh delivered" }));
    process.exit(1);
  }
  console.log(JSON.stringify({ level: "info", msg: "done", succeeded: payload.ok.length, failed: payload.failures.length }));
}

main().catch((e) => {
  console.error(JSON.stringify({ level: "error", msg: "runner crashed", error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
