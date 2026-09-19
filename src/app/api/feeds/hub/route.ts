import { buildFeedHub } from "@/lib/feeds/hub";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let cache: { at: number; payload: Awaited<ReturnType<typeof buildFeedHub>> } | null = null;
const TTL_MS = 45_000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  }
  try {
    const payload = await buildFeedHub();
    cache = { at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Feed hub failed" },
      { status: 500 },
    );
  }
}
