/**
 * Oracle Always Free: smart-notify cron runner.
 *
 * Performs IDENTICAL work to POST /api/cron/smart-notify (minus the HTTP
 * layer): runs the smart event detectors, scores + personalizes per user,
 * then delivers — critical push notifications + bell placement — via the
 * SAME @/lib/notify/smart pipeline the route uses (same detectors, same
 * scoring, same DB writes, same Telegram/push delivery behavior). No logic
 * is reimplemented here.
 *
 * NOTE: no HTTP exists on the VM, so the route's CRON_SECRET guard
 * (cronUnauthorized) is intentionally SKIPPED — this runs as trusted
 * execution context (a systemd timer on our own box), not an exposed
 * endpoint.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-smart-notify.ts [--dry=0|1]
 *
 * --dry=1 mirrors the route's ?dry=1: detection only, no pushes and no
 * interaction writes beyond dedupe.
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED  (required; any one)
 *   VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY                 (optional; push
 *       delivery is skipped gracefully when unset, detection still runs)
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */
import { hasDatabase, sql } from "@/lib/db";
import { runAllDetectors } from "@/lib/notify/smart/detectors";
import { runSmartDelivery } from "@/lib/notify/smart/deliver";

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

const dry = arg("dry") === "1" || arg("dry") === "true";

if (!hasDatabase()) {
  console.error(
    JSON.stringify({
      level: "warn",
      script: "run-smart-notify",
      msg: "DATABASE_URL / POSTGRES_URL / DATABASE_URL_UNPOOLED is not set — nothing to do",
    }),
  );
  process.exit(0);
}

async function main(): Promise<void> {
  if (dry) {
    // Mirrors the route's ?dry=1 branch exactly.
    const query = (s: TemplateStringsArray, ...v: unknown[]) =>
      sql()(s, ...v) as Promise<Record<string, unknown>[]>;
    const detected = await runAllDetectors({ query });
    console.log(
      JSON.stringify({
        ok: true,
        dry: true,
        detected: detected.length,
        sample: detected
          .slice(0, 5)
          .map((d) => ({ key: d.key, title: d.title, importance: d.importance })),
      }),
    );
    return;
  }
  const report = await runSmartDelivery();
  console.log(JSON.stringify({ ok: true, ...report }));
}

main().catch((e: unknown) => {
  console.error(
    JSON.stringify({
      level: "error",
      script: "run-smart-notify",
      msg: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
});
