import { buildLegalRiskHub } from "@/lib/legal-risk/build-hub";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

let cache: { at: number; payload: Awaited<ReturnType<typeof buildLegalRiskHub>> } | null = null;
const TTL = 90_000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL) {
    return NextResponse.json(cache.payload, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=90" },
    });
  }
  try {
    const payload = await buildLegalRiskHub();
    cache = { at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=90" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Legal risk hub failed" },
      { status: 502 },
    );
  }
}
