import { NextResponse } from "next/server";
import { BROKER_SOURCES } from "@/lib/research/broker-sources";

export const revalidate = 900;

/**
 * GET /api/broker-research/sources
 *
 * Returns the broker research desk directory (public website links only).
 * Contains no coverage counts, reports, or ratings — those come from the
 * real ingested research_reports table.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    totalSources: BROKER_SOURCES.length,
    sources: BROKER_SOURCES,
  });
}
