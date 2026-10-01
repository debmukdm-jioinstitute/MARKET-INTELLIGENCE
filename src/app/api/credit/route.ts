import { loadCreditFeedSnapshot } from "@/lib/credit/load-feed";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/credit — live Indian rating-agency actions (RSS-first; Firecrawl/Crawl4AI optional).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";
  const snapshot = await loadCreditFeedSnapshot(deep ? { deep: true } : undefined);

  return NextResponse.json({
    ...snapshot,
    activities: snapshot.items,
    totalCount: snapshot.items.length,
    smallcapFunds: [],
    summary: snapshot.dataStatus === "AVAILABLE" ? snapshot.message : null,
  });
}
