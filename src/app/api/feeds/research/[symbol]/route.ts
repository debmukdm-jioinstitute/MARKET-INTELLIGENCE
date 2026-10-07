import { cachedSWR } from "@/lib/cache/redis";
import { buildResearchDetail } from "@/lib/feeds/research-detail";
import { after, NextResponse } from "next/server";

export const revalidate = 900;
export const maxDuration = 30;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await ctx.params;
  // Same key format as dossierCacheKey() in src/lib/research/panel-cache.ts (P2).
  const key = `dossier:v1:${decodeURIComponent(symbol).trim().toUpperCase()}`;
  try {
    const { value: payload, cache } = await cachedSWR(
      key,
      { freshMs: 60_000, ttlSec: 15 * 60 },
      () => buildResearchDetail(symbol),
      (task) => after(task),
    );
    if (!payload) {
      return NextResponse.json({ error: `Unknown symbol: ${symbol}` }, { status: 404 });
    }
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
        "x-mi-cache": cache,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Research detail failed" },
      { status: 502 },
    );
  }
}
