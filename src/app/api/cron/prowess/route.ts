import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cron: fetch the stalest Prowess reports for the Nifty 500 (resumable, time-boxed).
 * Optional ?symbols=INFY,TCS&reports=stock,profile for targeted runs; ?status=1 for coverage only.
 */
export async function GET() {
  return NextResponse.json({ ok: true, disabled: true, message: "CMIE Prowess integration has been removed." });
}
