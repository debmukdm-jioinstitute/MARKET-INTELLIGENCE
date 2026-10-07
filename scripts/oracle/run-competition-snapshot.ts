#!/usr/bin/env tsx
/**
 * Oracle Always Free: Alpha League closing snapshot cron
 * (was: Vercel POST /api/cron/competition-snapshot).
 *
 * Performs IDENTICAL work to the route: currentCompetition() +
 * takeSnapshot(c) from src/lib/competition/store — the same calls the route
 * makes. No HTTP, no CRON_SECRET check — the VM is the trust boundary.
 *
 * DEVIATION (documented): the route formats its answer with the json() /
 * dbFailure() helpers from @/lib/competition/http, but that module imports
 * next/server, which cannot load under plain tsx. Instead this script calls
 * the SAME underlying functions those helpers wrap — hasDatabase() +
 * ensureSchema() from @/lib/db (exactly what prepare() does) — and prints
 * the same JSON shape json() would produce (payload + DISCLAIMER).
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-competition-snapshot.ts
 *
 * stdout: { ok: true, skipped: true, disclaimer } when no live competition
 *         { ...takeSnapshot result, disclaimer } otherwise
 *         (exits 1 when the snapshot was refused — route's 409 — or the DB
 *         failed — route's 502).
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; required)
 *   COMPETITION_MIN_PRICE (optional; trade-lab pricing floor)
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */
import { ensureSchema, hasDatabase } from "@/lib/db";
import { DISCLAIMER } from "@/lib/competition/config";
import { currentCompetition, takeSnapshot } from "@/lib/competition/store";

const SCRIPT = "run-competition-snapshot";

/** Mirrors the route's json() helper: payload + DISCLAIMER, printed as the CLI's JSON summary. */
function out(value: object): void {
  console.log(JSON.stringify({ ...value, disclaimer: DISCLAIMER }));
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
  try {
    // Same as prepare() in the route: DB present (checked above) + schema ensured.
    await ensureSchema();
    const c = await currentCompetition();
    if (!c || c.status !== "live") {
      out({ ok: true, skipped: true });
      return;
    }
    const result = await takeSnapshot(c);
    out(result);
    if (!result.ok) process.exit(1); // route's 409: snapshot refused (not a trading day / before close)
  } catch {
    // Route's dbFailure(): 502 "Competition data is temporarily unavailable."
    out({ error: "Competition data is temporarily unavailable. Please retry." });
    process.exit(1);
  }
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
