#!/usr/bin/env tsx
/**
 * Oracle Always Free: twice-daily Telegram market-data briefing
 * (was: Vercel POST /api/cron/telegram-data-brief, chained by
 * scripts/collectors/run-collectors.ts after each 06:00/18:00 IST run).
 *
 * Performs IDENTICAL work to the route by importing the SAME lib functions:
 * buildDataBrief / sendDataBrief from @/lib/alerts/telegram-data-brief —
 * compact briefing of EVERY collector series to the owner's Telegram chats,
 * with persistent per-slot (AM/PM IST) dedup in `notify` state, surviving
 * redeploys. Nothing is reimplemented. No HTTP, no cronUnauthorized — the VM
 * is the trust boundary.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-telegram-data-brief.ts [--dry=1]
 *
 * --dry=1 mirrors the route's ?dry=1 (build the briefing, report what would
 * be sent, send nothing).
 *
 * stdout: { ok: true, dry: true, wouldSend, messages, series, stale, preview } (dry)
 *         { ok: true, sent, messages, series, stale, skipped? }               (live)
 *         { ok: false, error } on failure (exits 1).
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; required —
 *       priority in this order inside @/lib/db)
 *   TELEGRAM_BOT_TOKEN + (TELEGRAM_CHAT_ID | TELEGRAM_CHAT_IDS) — Telegram
 *       delivery; sendDataBrief no-ops with skipped:"unconfigured" when absent
 *   NEXT_PUBLIC_SITE_URL — used by @/lib/notify/telegram (defaults to
 *       https://getmarketintelligence.in inside the lib)
 *
 * CRON_SECRET is intentionally NOT read: auth existed only for the HTTP
 * route (Bearer <CRON_SECRET>), which does not run on the VM.
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */
import { hasDatabase } from "@/lib/db";

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

const SCRIPT = "run-telegram-data-brief";
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
    if (dry) {
      // Mirrors the route's ?dry=1 response shape exactly.
      const { buildDataBrief } = await import("@/lib/alerts/telegram-data-brief");
      const brief = await buildDataBrief().catch(() => ({ messages: [] as string[], series: 0, stale: 0 }));
      console.log(
        JSON.stringify({
          ok: true,
          dry: true,
          wouldSend: brief.messages.length > 0,
          messages: brief.messages.length,
          series: brief.series,
          stale: brief.stale,
          preview: brief.messages[0]?.slice(0, 500) ?? null,
        }),
      );
      return;
    }
    const { sendDataBrief } = await import("@/lib/alerts/telegram-data-brief");
    const report = await sendDataBrief().catch(() => ({
      sent: false,
      messages: 0,
      series: 0,
      stale: 0,
      skipped: "error" as const,
    }));
    console.log(JSON.stringify({ ok: true, ...report }));
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
