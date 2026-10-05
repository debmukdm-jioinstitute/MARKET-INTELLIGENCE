import { enrichIpoDetailWithGmp } from "@/lib/feeds/ipo/enrich-gmp";
import { resolveIpoDetail } from "@/lib/feeds/ipo/resolve-detail";
import { fetchUpstoxIpoDetail } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const revalidate = 900;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const detail = await fetchUpstoxIpoDetail(id);
    if (detail) {
      const enriched = await enrichIpoDetailWithGmp(detail);
      return NextResponse.json(enriched, {
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
      });
    }
    const fallback = await resolveIpoDetail(id);
    if (fallback) {
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
      });
    }
    return NextResponse.json({ error: "IPO not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox IPO detail failed" },
      { status: 502 },
    );
  }
}
