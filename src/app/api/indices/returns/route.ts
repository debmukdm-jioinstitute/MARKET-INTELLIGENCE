import { NextResponse } from "next/server";
import { buildIndexReturns } from "@/lib/feeds/india/index-returns";

export const revalidate = 21600;
export const maxDuration = 60;

/** GET /api/indices/returns — 1D…10Y returns + 52-week sparkline for NSE indices, from the NSE daily close archive. */
export async function GET() {
  const data = await buildIndexReturns();
  if (!data) return NextResponse.json({ error: "NSE archive unavailable" }, { status: 502 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
}
