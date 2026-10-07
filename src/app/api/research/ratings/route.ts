import { getCompanyCreditRatings } from "@/lib/research/ratings-crawler";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 900;

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

/**
 * GET /api/research/ratings?symbol=RELIANCE
 * Agency grid (CRISIL / CARE / ICRA) + radar events (downgrade, negative outlook,
 * negative watch, statutory NSE credit rating disclosures) newest-first.
 * Backed by live crawler with multi-tier caching (DB + in-memory + RetailBonds + NSE).
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) {
    return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  }

  try {
    const payload = await getCompanyCreditRatings(symbol);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": CACHE },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load credit ratings" },
      { status: 500 }
    );
  }
}
