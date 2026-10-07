#!/usr/bin/env tsx
/**
 * Oracle Always Free: collector cron runner (was: Vercel GET /api/cron/collect).
 *
 * Performs IDENTICAL work to the route by calling the same library function:
 * runCollectors from src/lib/collector/run. No HTTP, no cronUnauthorized —
 * the VM is the trust boundary.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-collect.ts [--only=rbi,ecb] [--dry=1]
 *
 * --only=a,b mirrors the route's ?only=a,b (subset of collector ids).
 * --dry=1    mirrors the route's ?dry=1 (fetch + validate, no DB writes).
 *
 * stdout: { ok, results } — the same shape as the route's JSON body
 * (route answers 502 when no collector succeeded → this script exits 1 then).
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; required
 *       unless --dry=1, which skips writes)
 *   HF_TOKEN, APIFY_TOKEN, YOUTUBE_API_KEY, BLS_API_KEY, FEED_USER_AGENT
 *       (optional; individual collectors degrade honestly without their key)
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */
import { hasDatabase } from "@/lib/db";
import { runCollectors } from "@/lib/collector/run";

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

const SCRIPT = "run-collect";
const dry = arg("dry") === "1" || arg("dry") === "true";

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
  const only = (arg("only") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(
    JSON.stringify({
      level: "info",
      script: SCRIPT,
      msg: "starting collector run",
      only: only.length ? only : "all",
      dry,
    }),
  );
  const t0 = Date.now();
  const results = await runCollectors(only.length ? only : undefined, dry);
  const ok = results.every((r) => r.ok);
  console.log(
    JSON.stringify({
      level: "info",
      script: SCRIPT,
      msg: "collector run done",
      collectors: results.length,
      okCount: results.filter((r) => r.ok).length,
      failedCollectors: results.filter((r) => !r.ok).map((r) => r.collector),
      ms: Date.now() - t0,
    }),
  );
  // Same shape the route returns: { ok, results } (route status: 200 when any
  // collector succeeded, 502 when none did).
  console.log(JSON.stringify({ ok, results }));
  if (!results.some((r) => r.ok)) process.exit(1);
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
