import { fetchUpstoxMarketHolidays, isMarketHolidayToday, nextMarketHoliday } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const holidays = await fetchUpstoxMarketHolidays();
    return NextResponse.json(
      {
        holidays,
        todayHoliday: isMarketHolidayToday(holidays),
        nextHoliday: nextMarketHoliday(holidays),
      },
      { headers: { "Cache-Control": "public, max-age=21600, stale-while-revalidate=43200" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox market info failed" },
      { status: 502 },
    );
  }
}
