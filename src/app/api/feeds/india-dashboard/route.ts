import { buildIndiaDashboard, buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let fullCache: { at: number; payload: Awaited<ReturnType<typeof buildIndiaDashboard>> } | null = null;
let quickCache: { at: number; payload: Awaited<ReturnType<typeof buildIndiaDashboardQuick>> } | null = null;
const FULL_TTL = 45_000;
const QUICK_TTL = 20_000;

export async function GET(request: Request) {
  const quick = new URL(request.url).searchParams.get("quick") === "1";
  const now = Date.now();

  if (quick) {
    if (quickCache && now - quickCache.at < QUICK_TTL) {
      return NextResponse.json(quickCache.payload, {
        headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
      });
    }
    const payload = await buildIndiaDashboardQuick();
    quickCache = { at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  }

  if (fullCache && now - fullCache.at < FULL_TTL) {
    return NextResponse.json(fullCache.payload, {
      headers: { "Cache-Control": "public, max-age=25, stale-while-revalidate=60" },
    });
  }
  try {
    const payload = await buildIndiaDashboard();
    fullCache = { at: now, payload };
    quickCache = {
      at: now,
      payload: {
        fetchedAt: payload.fetchedAt,
        pulse: payload.pulse,
        globalRadar: payload.globalRadar,
        indiaImpact: payload.indiaImpact,
      },
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=25, stale-while-revalidate=60" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "India dashboard failed" },
      { status: 502 },
    );
  }
}
