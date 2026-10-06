import { buildIndiaDashboard, buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";
import {
  loadPersistedIndiaDashboard,
  persistIndiaDashboard,
  quickPayloadFromDashboard,
} from "@/lib/feeds/india/dashboard-persist";
import { NextResponse } from "next/server";

export const revalidate = 300;
export const maxDuration = 60;

let fullCache: { at: number; payload: Awaited<ReturnType<typeof buildIndiaDashboard>> } | null = null;
let quickCache: { at: number; payload: Awaited<ReturnType<typeof buildIndiaDashboardQuick>> } | null = null;
let inflight: Promise<Awaited<ReturnType<typeof buildIndiaDashboard>>> | null = null;
let inflightQuick: Promise<Awaited<ReturnType<typeof buildIndiaDashboardQuick>>> | null = null;
const FULL_TTL = 45_000;
const QUICK_TTL = 20_000;

function refreshQuickCache() {
  if (!inflightQuick) {
    inflightQuick = buildIndiaDashboardQuick()
      .then((payload) => {
        quickCache = { at: Date.now(), payload };
        void persistIndiaDashboard(payload);
        return payload;
      })
      .finally(() => {
        inflightQuick = null;
      });
  }
  return inflightQuick;
}
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

    const persisted = await loadPersistedIndiaDashboard();
    const instant = quickCache?.payload ?? persisted ?? (fullCache ? quickPayloadFromDashboard(fullCache.payload) : null);
    if (instant) {
      void refreshQuickCache().catch(() => {});
      return NextResponse.json(instant, {
        headers: {
          "Cache-Control": "public, max-age=5, stale-while-revalidate=120",
          "x-stale": "1",
          "x-stale-source": quickCache ? "memory" : persisted ? "db" : "full-cache",
        },
      });
    }

    try {
      const payload = await refreshQuickCache();
      return NextResponse.json(payload, {
        headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
      });
    } catch {
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
    const slim = quickPayloadFromDashboard(payload);
    quickCache = { at: now, payload: slim };
    void persistIndiaDashboard(payload);
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
    const persisted = await loadPersistedIndiaDashboard();
    if (persisted) {
      return NextResponse.json(persisted, {
        headers: {
          "Cache-Control": "public, max-age=5, stale-while-revalidate=300",
          "x-stale": "1",
          "x-stale-source": "db",
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
