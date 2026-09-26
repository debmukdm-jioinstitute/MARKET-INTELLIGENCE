import { logAnalyticsEvent } from "@/lib/analytics/log-event";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Fire-and-forget analytics beacon — never blocks or errors the page for the visitor. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path : "";
    if (!path) return NextResponse.json({ ok: true });

    await logAnalyticsEvent({
      path,
      referrer: typeof body.referrer === "string" ? body.referrer : null,
      event_type: typeof body.event_type === "string" ? body.event_type : "pageview",
      session_id: typeof body.session_id === "string" ? body.session_id : null,
      duration_sec: typeof body.duration_sec === "number" ? body.duration_sec : null,
      user_agent: typeof body.user_agent === "string" ? body.user_agent : null,
      meta: body.meta && typeof body.meta === "object" ? body.meta : null,
    });
  } catch {
    // analytics must never break the app
  }
  return NextResponse.json({ ok: true });
}
