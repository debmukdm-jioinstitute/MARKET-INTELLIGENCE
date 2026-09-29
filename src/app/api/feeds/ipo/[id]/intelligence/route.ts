import { buildIpoIntelligence } from "@/lib/feeds/ipo/build-intelligence";
import { resolveIpoDetail } from "@/lib/feeds/ipo/resolve-detail";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const detail = await resolveIpoDetail(id);
    if (!detail) return NextResponse.json({ error: "IPO not found" }, { status: 404 });
    const intelligence = await buildIpoIntelligence(detail);
    return NextResponse.json(intelligence, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "IPO intelligence failed" },
      { status: 502 },
    );
  }
}
