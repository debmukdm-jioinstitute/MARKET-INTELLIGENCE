import { loadPromoterFeedSnapshot } from "@/lib/promoters/load-feed";
import { PROMOTER_RISK_PANEL_SOURCES } from "@/lib/intelligence/verification-links";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/promoters — RSS-first promoter/insider disclosures; Firecrawl/Crawl4AI optional on cron. */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  const snapshot = await loadPromoterFeedSnapshot(deep ? { deep: true } : undefined);

  return NextResponse.json({
    ...snapshot,
    activities: snapshot.items,
    totalCount: snapshot.items.length,
    summary: snapshot.dataStatus === "AVAILABLE" ? snapshot.message : null,
    verifyLinks: PROMOTER_RISK_PANEL_SOURCES,
  });
}
