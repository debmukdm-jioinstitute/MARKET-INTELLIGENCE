import { fetchUpstoxIpoDetail } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const detail = await fetchUpstoxIpoDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "IPO not found" }, { status: 404 });
    }
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox IPO detail failed" },
      { status: 502 },
    );
  }
}
