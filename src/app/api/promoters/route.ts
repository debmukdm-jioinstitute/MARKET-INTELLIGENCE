import { NextResponse } from "next/server";

/**
 * GET /api/promoters
 *
 * No live promoter/insider disclosure feed is connected. Returns an explicit
 * UNAVAILABLE payload with verify-at-source links instead of fabricated
 * activity records.
 */
export async function GET() {
  return NextResponse.json({
    activities: [],
    totalCount: 0,
    summary: null,
    dataStatus: "UNAVAILABLE",
    message:
      "Promoter and insider disclosures are not wired to a live source yet. No activity data is available.",
    verifyLinks: [
      {
        label: "NSE insider / SAST",
        href: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
      },
      {
        label: "NSE pledge / SHP",
        href: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern",
      },
      {
        label: "BSE insider",
        href: "https://www.bseindia.com/corporates/Insider_Trading.aspx",
      },
      { label: "SEBI", href: "https://www.sebi.gov.in/" },
    ],
  });
}
