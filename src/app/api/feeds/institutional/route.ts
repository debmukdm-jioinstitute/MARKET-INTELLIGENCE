import { buildInstitutionalIntelligence } from "@/lib/institutional/build-hub";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let cache: { at: number; payload: Awaited<ReturnType<typeof buildInstitutionalIntelligence>> } | null = null;
const TTL = 45_000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL) {
    return NextResponse.json(cache.payload, {
      headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=45" },
    });
  }
  try {
    const payload = await buildInstitutionalIntelligence();
    cache = { at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=45" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Institutional intelligence failed" },
      { status: 502 },
    );
  }
}
