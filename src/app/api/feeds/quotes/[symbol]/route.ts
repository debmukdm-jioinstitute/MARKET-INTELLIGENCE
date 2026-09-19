import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await ctx.params;
  const sym = symbol.toUpperCase();
  try {
    const points = await fetchYahooHistory(sym, "2y");
    return NextResponse.json({ symbol: sym, points });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Quote history failed" },
      { status: 502 },
    );
  }
}
