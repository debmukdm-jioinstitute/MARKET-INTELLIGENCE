import { readAppCache, writeAppCache } from "@/lib/app-cache";
import { buildHomeMarketHeadlines } from "@/lib/homedashboard/live-headlines";
import type { HomeHeadline } from "@/lib/homedashboard/brief";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CACHE_KEY = "home_market_headlines";

export async function GET() {
  const cached = await readAppCache<HomeHeadline[]>(CACHE_KEY);
  try {
    const headlines = await buildHomeMarketHeadlines(5, 8);
    if (headlines.length) void writeAppCache(CACHE_KEY, headlines);
    return NextResponse.json(
      { headlines: headlines.length ? headlines : (cached?.value ?? []), stale: false },
      { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=120" } },
    );
  } catch {
    if (cached?.value?.length) {
      return NextResponse.json(
        { headlines: cached.value, stale: true },
        { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=300", "x-stale": "1" } },
      );
    }
    return NextResponse.json({ headlines: [], stale: true }, { status: 503 });
  }
}
