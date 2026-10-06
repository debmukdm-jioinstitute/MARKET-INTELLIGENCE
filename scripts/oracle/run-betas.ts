#!/usr/bin/env tsx
/**
 * Oracle Always Free: factor-beta refresh cron (was: Vercel GET /api/cron/betas).
 *
 * Performs IDENTICAL work to the route: computeBetas() + saveBetas() from
 * src/lib/transmission/betas. No HTTP, no cronUnauthorized — the VM is the
 * trust boundary.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-betas.ts [--dry=1]
 *
 * --dry=1 mirrors the route's ?dry=1 (compute without saving).
 *
 * stdout: { ok: true, persisted, sectors, window } on success
 *         { ok: false, error } on failure (exits 1).
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; required)
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */
import { hasDatabase } from "@/lib/db";
import { computeBetas, saveBetas } from "@/lib/transmission/betas";

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

const SCRIPT = "run-betas";
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
    const b = await computeBetas();
    const persisted = !dry;
    if (!dry) await saveBetas(b);
    console.log(
      JSON.stringify({ ok: true, persisted, sectors: b.sectors.length, window: [b.windowStart, b.windowEnd] }),
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
