import { buildSearchTrendHub } from "@/lib/search-trends/build-hub";
import type { SearchTrendCategory } from "@/lib/search-trends/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let cache: { key: string; at: number; payload: Awaited<ReturnType<typeof buildSearchTrendHub>> } | null = null;
const TTL = 6 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") as SearchTrendCategory | null;
  const keyword = url.searchParams.get("keyword") ?? url.searchParams.get("q") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const key = `${category ?? "all"}|${keyword ?? ""}|${limit ?? "all"}`;

  const now = Date.now();
  if (cache && cache.key === key && now - cache.at < TTL) {
    return NextResponse.json(cache.payload, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  }

  try {
    const payload = await buildSearchTrendHub({
      category: category ?? undefined,
      keyword,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    cache = { key, at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search trend hub failed" },
      { status: 502 },
    );
  }
}
