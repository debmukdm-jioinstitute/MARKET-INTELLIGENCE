import { cronUnauthorized } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { evaluateRules } from "@/lib/alerts/evaluate";
import { sendMorningAlertDigests } from "@/lib/alerts/morning-digest";
import { buildSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Every 3h: evaluate all active user alert rules against the live snapshot. ?dry=1 lists what would fire without sending. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "No database configured" }, { status: 503 });
  try {
    const snap = await buildSnapshot();
    const dry = new URL(req.url).searchParams.get("dry") === "1";
    const report = await evaluateRules(snap.metrics, dry);
    const digest = dry ? { usersDigested: 0, eventsCompressed: 0 } : await sendMorningAlertDigests().catch(() => ({ usersDigested: 0, eventsCompressed: 0 }));
    return NextResponse.json({ ok: true, ...report, digest });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
