import { cachedSWR } from "@/lib/cache/redis";
import { buildSearchTrendHub } from "@/lib/search-trends/build-hub";
import type { SearchTrendCategory } from "@/lib/search-trends/types";
import { after, NextResponse } from "next/server";

export const revalidate = 900;
export const maxDuration = 60;

type Payload = Awaited<ReturnType<typeof buildSearchTrendHub>>;

let cache: { key: string; at: number; payload: Payload } | null = null;
const TTL = 6 * 60 * 60 * 1000;
const HEADERS = { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") as SearchTrendCategory | null;
  const keyword = url.searchParams.get("keyword") ?? url.searchParams.get("q") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const key = `${category ?? "all"}|${keyword ?? ""}|${limit ?? "all"}`;

  const now = Date.now();
  if (cache && cache.key === key && now - cache.at < TTL) {
    return NextResponse.json(cache.payload, { headers: { ...HEADERS, "x-mi-cache": "memory" } });
  }

  try {
    const build = () =>
      buildSearchTrendHub({
        category: category ?? undefined,
        keyword,
        limit: Number.isFinite(limit) ? limit : undefined,
      });
    // Shared Redis SWR only for the fixed (keyword-free) views, so user-typed keywords
    // cannot create unbounded cache keys. Keyword searches keep the old behaviour.
    const limitOk = limit === undefined || (Number.isInteger(limit) && limit > 0 && limit <= 100);
    const cacheable = !keyword && limitOk && (category === null || /^[a-z_-]{1,32}$/i.test(category));
    const { value: payload, cache: status } = cacheable
      ? await cachedSWR<Payload>(
          `search-trends:v1:${category ?? "all"}:${Number.isFinite(limit) ? limit : "all"}`,
          { freshMs: 60 * 60_000, ttlSec: 24 * 60 * 60 },
          build,
          (task) => after(task),
        )
      : { value: await build(), cache: "off" as const };
    if (!payload) throw new Error("Search trend hub returned no data");
    cache = { key, at: now, payload };
    return NextResponse.json(payload, { headers: { ...HEADERS, "x-mi-cache": status } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search trend hub failed" },
      { status: 502 },
    );
  }
}
