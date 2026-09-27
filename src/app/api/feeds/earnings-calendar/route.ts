import { buildEarningsCalendarPanel } from "@/lib/feeds/earnings/build-calendar";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const payload = await buildEarningsCalendarPanel();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Earnings calendar failed" },
      { status: 502 },
    );
  }
}
