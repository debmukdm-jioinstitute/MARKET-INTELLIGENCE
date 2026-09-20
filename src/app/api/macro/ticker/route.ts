import { buildLiveTicker } from "@/lib/macro/build-live-ticker";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL_MS = 45_000;
let cache: { at: number; payload: Awaited<ReturnType<typeof buildLiveTicker>> } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return NextResponse.json(cache.payload, {
        headers: { "Cache-Control": "public, max-age=25, stale-while-revalidate=45" },
      });
    }
    const payload = await buildLiveTicker();
    cache = { at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=25, stale-while-revalidate=45" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ticker failed" },
      { status: 502 },
    );
  }
}
