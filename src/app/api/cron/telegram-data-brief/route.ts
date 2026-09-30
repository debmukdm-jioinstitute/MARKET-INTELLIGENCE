import { cronUnauthorized } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { sendDataBrief } from "@/lib/alerts/telegram-data-brief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Twice daily (06:30 + 18:30 IST, after the GitHub Actions collector runs):
 * broadcast ALL collected market data to the owner's Telegram chats as a
 * compact briefing. ?dry=1 reports what would be sent without sending.
 * Auth: Bearer <CRON_SECRET> (same as other crons).
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (dry) {
    const { buildDataBrief } = await import("@/lib/alerts/telegram-data-brief");
    const brief = await buildDataBrief().catch(() => ({ messages: [] as string[], series: 0, stale: 0 }));
    return NextResponse.json({
      ok: true,
      dry: true,
      wouldSend: brief.messages.length > 0,
      messages: brief.messages.length,
      series: brief.series,
      stale: brief.stale,
      preview: brief.messages[0]?.slice(0, 500) ?? null,
    });
  }
  const report = await sendDataBrief().catch(() => ({
    sent: false,
    messages: 0,
    series: 0,
    stale: 0,
    skipped: "error" as const,
  }));
  return NextResponse.json({ ok: true, ...report });
}
