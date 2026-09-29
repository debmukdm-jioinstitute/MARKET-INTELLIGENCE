import { cronUnauthorized } from "@/lib/api-guard";
import { getFeedHubCached } from "@/lib/feeds/hub-cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  try {
    const payload = await getFeedHubCached(true);
    return NextResponse.json({
      ok: true,
      fetchedAt: payload.fetchedAt,
      newsCount: payload.news.length,
      openSources: payload.health.filter((h) =>
        ["reddit", "livemint", "moneycontrol", "googlenews", "busstd", "rsswire"].includes(h.id),
      ),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "warm failed" },
      { status: 500 },
    );
  }
}
