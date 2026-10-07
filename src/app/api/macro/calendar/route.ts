import { getEconomicCalendar, type EventRegion, type ImpactLevel } from "@/lib/macro/economic-calendar";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const regionParam = url.searchParams.get("region")?.trim().toUpperCase() as EventRegion | "ALL" | null;
    const impactParam = url.searchParams.get("impact")?.trim().toUpperCase() as ImpactLevel | "ALL" | null;

    const region = regionParam && ["IND", "USA", "GLOBAL", "ALL"].includes(regionParam)
      ? (regionParam === "ALL" ? "all" : (regionParam as EventRegion))
      : "all";

    const impact = impactParam && ["HIGH", "MEDIUM", "LOW", "ALL"].includes(impactParam)
      ? (impactParam === "ALL" ? "all" : (impactParam as ImpactLevel))
      : "all";

    const calendar = await getEconomicCalendar({ region, impact });

    return NextResponse.json(calendar, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load economic calendar" },
      { status: 500 }
    );
  }
}
