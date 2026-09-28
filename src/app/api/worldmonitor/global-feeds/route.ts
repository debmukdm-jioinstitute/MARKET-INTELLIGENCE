import { buildFreeGlobalFeeds } from "@/lib/worldmonitor/free-global-feeds";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

let cache: { at: number; payload: Awaited<ReturnType<typeof buildFreeGlobalFeeds>> } | null = null;
const TTL_MS = 90_000;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return NextResponse.json(cache.payload, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
      });
    }
    const payload = await buildFreeGlobalFeeds();
    cache = { at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Global feeds failed" },
      { status: 502 },
    );
  }
}
