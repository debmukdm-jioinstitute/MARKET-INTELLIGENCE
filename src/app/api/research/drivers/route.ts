import { NextResponse } from "next/server";
import { buildDrivers } from "@/lib/guide/drivers-service";

export type { DriverCard } from "@/lib/guide/drivers-service";

export const revalidate = 900;

const CACHE = "public, s-maxage=900, stale-while-revalidate=900";

/**
 * GET /api/research/drivers?symbol=POLICYBZR&name=PB%20Fintech
 * Business-line drivers (regulation, policy, commodities, competition) for ANY NSE stock, ranked by
 * company-specific and in-the-news evidence. Rules + text inference + free news RSS: no paid model calls.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const symbol = sp.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  const payload = await buildDrivers(symbol, sp.get("name"));
  return NextResponse.json(payload, { headers: { "Cache-Control": payload.newsChecked ? CACHE : "public, s-maxage=60" } });
}
