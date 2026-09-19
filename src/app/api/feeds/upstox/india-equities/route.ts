import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { fetchUpstoxQuotes } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let cache: { at: number; quotes: Awaited<ReturnType<typeof fetchUpstoxQuotes>> } | null = null;
const TTL_MS = 8_000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json({ quotes: cache.quotes }, {
      headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=10" },
    });
  }
  try {
    const quotes = await fetchUpstoxQuotes(
      INDIA_EQUITIES.map((i) => ({ instrumentKey: i.instrumentKey, symbol: i.symbol })),
    );
    cache = { at: now, quotes };
    return NextResponse.json({ quotes }, {
      headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=10" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox quotes failed" },
      { status: 502 },
    );
  }
}
