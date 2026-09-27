import { cronUnauthorized } from "@/lib/api-guard";
import { getMarketShiftsCached } from "@/lib/feeds/what-changed/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Warm institutional shifts panel every few hours (see vercel.json). ?dry=1 skips force rebuild. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const force = new URL(req.url).searchParams.get("dry") !== "1";
  try {
    const payload = await getMarketShiftsCached(force);
    return NextResponse.json({
      ok: true,
      fetchedAt: payload.fetchedAt,
      slot: payload.slot,
      items: payload.items.length,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
