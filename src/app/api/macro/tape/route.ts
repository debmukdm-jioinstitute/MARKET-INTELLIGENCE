import { buildMacroTape } from "@/lib/macro/build-tape";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TTL_MS = 60_000;
let cache: { at: number; payload: Awaited<ReturnType<typeof buildMacroTape>> } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return NextResponse.json(cache.payload, {
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
      });
    }
    const payload = await buildMacroTape();
    cache = { at: now, payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Macro tape failed" },
      { status: 502 },
    );
  }
}
