import { buildIndiaDashboard, buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";
import { NextResponse } from "next/server";

export const revalidate = 300;
export const maxDuration = 60;

let fullCache: { at: number; payload: Awaited<ReturnType<typeof buildIndiaDashboard>> } | null = null;
let quickCache: { at: number; payload: Awaited<ReturnType<typeof buildIndiaDashboardQuick>> } | null = null;
let inflight: Promise<Awaited<ReturnType<typeof buildIndiaDashboard>>> | null = null;
const FULL_TTL = 45_000;
const QUICK_TTL = 20_000;
/** Hard wall: if buildIndiaDashboard hasn't finished in 55 s, serve the last good cache or a slim 206 */
const BUILD_DEADLINE_MS = 55_000;

async function buildWithDeadline() {
  const deadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("DEADLINE_EXCEEDED")), BUILD_DEADLINE_MS),
  );
  return Promise.race([buildIndiaDashboard(), deadline]);
}

export async function GET(request: Request) {
  const quick = new URL(request.url).searchParams.get("quick") === "1";
  const now = Date.now();

  if (quick) {
    if (quickCache && now - quickCache.at < QUICK_TTL) {
      return NextResponse.json(quickCache.payload, {
        headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
      });
    }
    try {
      const payload = await buildIndiaDashboardQuick();
      quickCache = { at: now, payload };
      return NextResponse.json(payload, {
        headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
      });
    } catch {
      // If quick build fails, serve stale quick cache or fall through to full cache
      if (quickCache) {
        return NextResponse.json(quickCache.payload, {
          headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=60", "x-stale": "1" },
        });
      }
      if (fullCache) {
        return NextResponse.json(fullCache.payload, {
          headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=60", "x-stale": "1" },
        });
      }
      return NextResponse.json({ error: "Quick feed unavailable" }, { status: 503 });
    }
  }

  // Serve from full cache if still fresh
  if (fullCache && now - fullCache.at < FULL_TTL) {
    return NextResponse.json(fullCache.payload, {
      headers: { "Cache-Control": "public, max-age=25, stale-while-revalidate=60" },
    });
  }

  // Deduplicate concurrent full builds — only one in-flight at a time
  if (!inflight) {
    inflight = buildWithDeadline().finally(() => {
      inflight = null;
    });
  }

  try {
    const payload = await inflight;
    fullCache = { at: now, payload };
    quickCache = {
      at: now,
      payload: {
        fetchedAt: payload.fetchedAt,
        pulse: payload.pulse,
        globalRadar: payload.globalRadar,
        indiaImpact: payload.indiaImpact,
        moneyFlow: payload.moneyFlow,
        indiaMacro: payload.indiaMacro,
        rbiLiquidity: {
          systemLiquidity: payload.rbiLiquidity.systemLiquidity,
          corridor: payload.rbiLiquidity.corridor,
          fxReserves: payload.rbiLiquidity.fxReserves,
          rows: payload.rbiLiquidity.rows,
        },
      },
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=25, stale-while-revalidate=60" },
    });
  } catch (e) {
    const isDeadline = e instanceof Error && e.message === "DEADLINE_EXCEEDED";
    // Serve stale cache rather than an error whenever we have something
    if (fullCache) {
      return NextResponse.json(fullCache.payload, {
        headers: {
          "Cache-Control": "public, max-age=5, stale-while-revalidate=120",
          "x-stale": "1",
          "x-stale-reason": isDeadline ? "timeout" : "upstream_error",
        },
      });
    }
    // Nothing cached at all — return 503 (not 504) with a user-friendly message
    return NextResponse.json(
      { error: isDeadline ? "Feed is warming up — refresh in a moment" : (e instanceof Error ? e.message : "India dashboard unavailable") },
      { status: 503 },
    );
  }
}
