#!/usr/bin/env tsx
/**
 * Oracle Always Free: user-alert evaluation cron (was: Vercel GET /api/cron/alerts).
 *
 * Performs IDENTICAL work to the route: buildSnapshot() from src/lib/snapshot,
 * then evaluateRules() from src/lib/alerts/evaluate, followed by
 * sendMorningAlertDigests(), sendTelegramDigest() and checkHealthAlerts() —
 * each best-effort (a digest/delivery failure must not fail the evaluation).
 * No HTTP, no cronUnauthorized — the VM is the trust boundary.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-alerts.ts [--dry=1]
 *
 * --dry=1 mirrors the route's ?dry=1 (lists what would fire, sends nothing).
 *
 * stdout: { ok: true, ...evalReport, digest, telegram, health } on success
 *         { ok: false, error } on failure (exits 1).
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; required)
 *   RESEND_API_KEY (+ RESEND_FROM_EMAIL) — email digests; skipped gracefully
 *       when unset
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID — Telegram digests; silent no-op
 *       when unconfigured
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */
import { hasDatabase } from "@/lib/db";
import { evaluateRules } from "@/lib/alerts/evaluate";
import { sendMorningAlertDigests } from "@/lib/alerts/morning-digest";
import { sendTelegramDigest } from "@/lib/alerts/telegram-digest";
import { buildSnapshot } from "@/lib/snapshot";
import { checkHealthAlerts } from "@/lib/health/failure-alerts";

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

const SCRIPT = "run-alerts";
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
    const snap = await buildSnapshot();
    const report = await evaluateRules(snap.metrics, dry);
    const digest = dry
      ? { usersDigested: 0, eventsCompressed: 0 }
      : await sendMorningAlertDigests().catch(() => ({ usersDigested: 0, eventsCompressed: 0 }));
    // Free Zapier replacement: owner's Telegram morning digest (once per IST
    // day, silent no-op when unconfigured).
    const telegram = dry
      ? { sent: false, events: 0, chats: 0 }
      : await sendTelegramDigest().catch(() => ({ sent: false, events: 0, chats: 0 }));
    // Source-health failure alerts (one Telegram message per incident, silent
    // no-op when unconfigured).
    const health = dry
      ? { checked: 0, alerted: [], recovered: [] }
      : await checkHealthAlerts().catch(() => ({ checked: 0, alerted: [], recovered: [], skippedNoTelegram: true }));
    console.log(JSON.stringify({ ok: true, ...report, digest, telegram, health }));
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
