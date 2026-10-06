#!/usr/bin/env tsx
/**
 * Oracle Always Free: stress-index snapshot cron (was: Vercel GET /api/cron/stress).
 *
 * Performs IDENTICAL work to the route: buildStress() from src/lib/stress/build,
 * then (unless --dry=1) saveStress() + maybeFireAlert() from src/lib/stress/store.
 * No HTTP, no cronUnauthorized — the VM is the trust boundary.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-stress.ts [--dry=1]
 *
 * --dry=1 mirrors the route's ?dry=1 (compute only, no persistence).
 *
 * stdout: { ok: true, persisted, result } in dry mode
 *         { ok: true, persisted: true, score, band, convergence, alert } otherwise
 *         { ok: false, error } on failure (exits 1).
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; required)
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */
import { hasDatabase } from "@/lib/db";
import { buildStress } from "@/lib/stress/build";
import { maybeFireAlert, saveStress } from "@/lib/stress/store";

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

const SCRIPT = "run-stress";
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
  try {
    const result = await buildStress();
    if (dry) {
      console.log(JSON.stringify({ ok: true, persisted: false, result }));
      return;
    }
    await saveStress(result);
    const alert = await maybeFireAlert(result);
    console.log(
      JSON.stringify({
        ok: true,
        persisted: true,
        score: result.score,
        band: result.band,
        convergence: result.convergence,
        alert,
      }),
    );
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
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
