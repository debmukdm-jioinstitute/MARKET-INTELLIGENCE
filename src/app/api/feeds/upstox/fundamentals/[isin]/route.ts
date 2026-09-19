import { fetchUpstoxKeyRatios } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ isin: string }> }) {
  const { isin } = await ctx.params;
  try {
    const snapshot = await fetchUpstoxKeyRatios(isin);
    if (!snapshot) {
      return NextResponse.json({ error: "No fundamentals data" }, { status: 502 });
    }
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox fundamentals failed" },
      { status: 502 },
    );
  }
}
