import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { evaluateRules } from "@/lib/alerts/evaluate";
import { buildSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Every 3h: evaluate all active user alert rules against the live snapshot. ?dry=1 lists what would fire without sending. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "No database configured" }, { status: 503 });
  try {
    const snap = await buildSnapshot();
    return NextResponse.json({ ok: true, ...(await evaluateRules(snap.metrics, new URL(req.url).searchParams.get("dry") === "1")) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
