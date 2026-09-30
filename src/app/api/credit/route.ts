import { NextResponse } from "next/server";
import { getCreditDataAvailability } from "@/lib/credit/database";

/**
 * GET /api/credit
 *
 * Honest unavailable state: there is currently no live credit-rating feed.
 * Indian rating agencies publish press releases on their own portals and
 * offer no free rating-action API/RSS, so this endpoint returns no rating
 * actions rather than fabricated ones.
 */
export async function GET() {
  const availability = getCreditDataAvailability();
  return NextResponse.json({
    activities: [],
    smallcapFunds: [],
    totalCount: 0,
    dataStatus: availability.dataStatus,
    message: availability.message,
    summary: null,
  });
}
