import { cronUnauthorized } from "@/lib/api-guard";
import { withCronRun } from "@/lib/admin/cron-log";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { evaluateRules } from "@/lib/alerts/evaluate";
import { sendMorningAlertDigests } from "@/lib/alerts/morning-digest";
import { sendTelegramDigest } from "@/lib/alerts/telegram-digest";
import { buildSnapshot } from "@/lib/snapshot";
import { checkHealthAlerts } from "@/lib/health/failure-alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Every 3h: evaluate all active user alert rules against the live snapshot, then send digests (email + Telegram). ?dry=1 lists what would fire without sending. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  return withCronRun("alerts", req, async () => {
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "No database configured" }, { status: 503 });
  try {
    const snap = await buildSnapshot();
    const dry = new URL(req.url).searchParams.get("dry") === "1";
    const report = await evaluateRules(snap.metrics, dry);
    const digest = dry
      ? { usersDigested: 0, eventsCompressed: 0 }
      : await sendMorningAlertDigests().catch(() => ({ usersDigested: 0, eventsCompressed: 0 }));
    // Free Zapier replacement: owner's Telegram morning digest (once per IST day, silent no-op when unconfigured).
    const telegram = dry
      ? { sent: false, events: 0, chats: 0 }
      : await sendTelegramDigest().catch(() => ({ sent: false, events: 0, chats: 0 }));
    // Phase 5: source-health failure alerts (one Telegram message per incident, silent no-op when unconfigured).
    const health = dry ? { checked: 0, alerted: [], recovered: [] } : await checkHealthAlerts().catch(() => ({ checked: 0, alerted: [], recovered: [], skippedNoTelegram: true }));
    return NextResponse.json({ ok: true, ...report, digest, telegram, health });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  },
    (b) => { const x = b as { fired?: unknown }; return Array.isArray(x?.fired) ? x.fired.length : (typeof x?.fired === "number" ? x.fired : 0); },
  );
}
