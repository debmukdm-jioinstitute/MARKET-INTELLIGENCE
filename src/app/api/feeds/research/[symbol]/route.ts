import { buildResearchDetail } from "@/lib/feeds/research-detail";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await ctx.params;
  try {
    const payload = await buildResearchDetail(symbol);
    if (!payload) {
      return NextResponse.json({ error: `Unknown symbol: ${symbol}` }, { status: 404 });
    }
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=45" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Research detail failed" },
      { status: 502 },
    );
  }
}
