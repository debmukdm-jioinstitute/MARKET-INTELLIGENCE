import { enrichIpoDetailWithGmp, enrichIpoListWithGmp } from "@/lib/feeds/ipo/enrich-gmp";
import type { IpoDetail, IpoStatus } from "@/lib/feeds/ipo/types";
import { fetchUpstoxIpoDetail, fetchUpstoxIpoList } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function detailFromGmpFallback(id: string): Promise<IpoDetail | null> {
  if (!id.startsWith("gmp-")) return null;
  for (const status of ["open", "upcoming"] as IpoStatus[]) {
    const rows = await enrichIpoListWithGmp([], status);
    const hit = rows.find((r) => r.id === id);
    if (!hit) continue;
    return {
      ...hit,
      faceValue: null,
      lotSize: null,
      minimumQuantity: null,
      cutOffPrice: null,
      listingPrice: null,
      listingExchange: null,
      rhpUrl: null,
      drhpUrl: null,
      timeline: {},
      registrar: null,
    };
  }
  return null;
}

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
    const fallback = await detailFromGmpFallback(id);
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
