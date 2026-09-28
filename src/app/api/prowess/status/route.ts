import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ live: false, configured: false, cachedReports: 0, message: "CMIE Prowess data has been removed." });
}
