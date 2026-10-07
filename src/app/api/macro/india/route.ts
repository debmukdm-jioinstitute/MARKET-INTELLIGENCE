import { cachedSWR } from "@/lib/cache/redis";
import { buildIndiaMacroHub } from "@/lib/macro/build-hub";
import { after, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Payload = Awaited<ReturnType<typeof buildIndiaMacroHub>>;

const TTL_MS = 90_000;
let cache: { at: number; payload: Payload } | null = null;
const HEADERS = { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800" };

/**
 * Two cache layers: per-instance memory (90 s) and shared Redis with stale-while-revalidate
 * (fresh 10 min, kept 6 h). A stale Redis copy is served instantly and refreshed after the
 * response, so only the very first request after a cold Redis pays the ~14 s build.
 */
export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return NextResponse.json(cache.payload, { headers: { ...HEADERS, "x-mi-cache": "memory" } });
    }
    const { value: payload, cache: status } = await cachedSWR<Payload>(
      "macro:india:v1",
      { freshMs: 10 * 60_000, ttlSec: 6 * 60 * 60 },
      () => buildIndiaMacroHub(),
      (task) => after(task),
    );
    if (!payload) throw new Error("Macro hub returned no data");
    cache = { at: now, payload };
    return NextResponse.json(payload, { headers: { ...HEADERS, "x-mi-cache": status } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Macro hub failed" },
      { status: 502 },
    );
  }
}
