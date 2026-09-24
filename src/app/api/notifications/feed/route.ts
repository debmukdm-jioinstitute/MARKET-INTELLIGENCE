import { after, NextResponse } from "next/server";
import { runLiveDetection } from "@/lib/notify/run";
import { listEvents } from "@/lib/notify/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Site-wide change feed (public — the events are aggregate market data, the same for every visitor).
 * Returns the newest events immediately and, after responding, refreshes the live detectors (throttled), so a
 * visitor's poll is what keeps the feed current without needing a frequent cron.
 */
export async function GET() {
  after(() => runLiveDetection().catch(() => {}));
  const events = await listEvents(60).catch(() => []);
  return NextResponse.json({ events, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
