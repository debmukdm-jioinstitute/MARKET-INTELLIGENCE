import { buildIndiaDashboard } from "@/lib/feeds/india/build-dashboard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let cache: { at: number; payload: Awaited<ReturnType<typeof buildIndiaDashboard>> } | null = null;
const TTL_MS = 50_000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: { "Cache-Control": "public, max-age=25, stale-while-revalidate=60" },
    });
  }
  try {
    const payload = await buildIndiaDashboard();
    cache = { at: now, payload };
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
