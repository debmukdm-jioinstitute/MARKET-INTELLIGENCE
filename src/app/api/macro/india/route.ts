import { buildIndiaMacroHub } from "@/lib/macro/build-hub";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL_MS = 90_000;
let cache: { at: number; payload: Awaited<ReturnType<typeof buildIndiaMacroHub>> } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return NextResponse.json(cache.payload, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
      });
    }
    const payload = await buildIndiaMacroHub();
    cache = { at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Macro hub failed" },
      { status: 502 },
    );
  }
}
