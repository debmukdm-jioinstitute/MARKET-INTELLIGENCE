import { cronUnauthorized } from "@/lib/api-guard";
import { withCronRun, withTimeout } from "@/lib/admin/cron-log";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { evaluateRules } from "@/lib/alerts/evaluate";
import { sendMorningAlertDigests } from "@/lib/alerts/morning-digest";
import { sendTelegramDigest } from "@/lib/alerts/telegram-digest";
import { buildSnapshot, type Snapshot } from "@/lib/snapshot";
import { checkHealthAlerts } from "@/lib/health/failure-alerts";
import { readAppCache } from "@/lib/app-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 40s compute budget: Vercel kills this function at 60s (causing collect-market-data 504 failure). */
const SNAPSHOT_BUDGET_MS = 40_000;

async function getFallbackSnapshot(): Promise<Snapshot | null> {
  try {
    const row = await readAppCache<Snapshot>("market_snapshot");
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Every 3h: evaluate all active user alert rules against the live snapshot, then send digests (email + Telegram). ?dry=1 lists what would fire without sending. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  return withCronRun(
    "alerts",
    req,
    async () => {
      if (!hasDatabase()) return NextResponse.json({ ok: false, error: "No database configured" }, { status: 503 });
      try {
        let snap: Snapshot | null = null;
        let stale = false;
        try {
          snap = await withTimeout(buildSnapshot(), SNAPSHOT_BUDGET_MS, "buildSnapshot");
        } catch {
          snap = await getFallbackSnapshot();
          stale = true;
        }

        if (!snap) {
          return NextResponse.json({ ok: false, error: "Snapshot unavailable for alert evaluation" }, { status: 504 });
        }

        const dry = new URL(req.url).searchParams.get("dry") === "1";
        const report = await evaluateRules(snap.metrics, dry);

        const [digestRes, telegramRes, healthRes] = await Promise.allSettled([
          dry ? Promise.resolve({ usersDigested: 0, eventsCompressed: 0 }) : withTimeout(sendMorningAlertDigests(), 8_000, "morningDigests"),
          dry ? Promise.resolve({ sent: false, events: 0, chats: 0 }) : withTimeout(sendTelegramDigest(), 8_000, "telegramDigest"),
          dry ? Promise.resolve({ checked: 0, alerted: [], recovered: [] }) : withTimeout(checkHealthAlerts(), 8_000, "healthAlerts"),
        ]);

        const digest = digestRes.status === "fulfilled" ? digestRes.value : { usersDigested: 0, eventsCompressed: 0, error: String(digestRes.reason) };
        const telegram = telegramRes.status === "fulfilled" ? telegramRes.value : { sent: false, events: 0, chats: 0, error: String(telegramRes.reason) };
        const health = healthRes.status === "fulfilled" ? healthRes.value : { checked: 0, alerted: [], recovered: [], error: String(healthRes.reason) };

        return NextResponse.json({ ok: true, stale, ...report, digest, telegram, health });
      } catch (e) {
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
      }
    },
    (b) => {
      const x = b as { fired?: unknown };
      return Array.isArray(x?.fired) ? x.fired.length : typeof x?.fired === "number" ? x.fired : 0;
    },
  );
}
