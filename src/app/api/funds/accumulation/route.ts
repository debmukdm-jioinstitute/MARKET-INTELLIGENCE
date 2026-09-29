import { NextRequest, NextResponse } from "next/server";
import { getAllMutualFunds } from "@/lib/funds/database";
import {
  computeInstitutionalAccumulation,
  filterAccumulationRadar,
  getInstitutionalSectorFlows,
} from "@/lib/funds/analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get("sector") || undefined;
    const marketCap = searchParams.get("marketCap") || undefined;
    const trend = searchParams.get("trend") || undefined;
    const search = searchParams.get("q") || undefined;

    const funds = getAllMutualFunds();
    const allAccumulated = computeInstitutionalAccumulation(funds);
    const filtered = filterAccumulationRadar(allAccumulated, {
      sector,
      marketCap,
      trend,
      search,
    });

    const sectorFlows = getInstitutionalSectorFlows(funds);

    const topAccumulated = allAccumulated.filter((s) => s.netValueBoughtCr > 0).slice(0, 5);
    const topTrimmed = allAccumulated.filter((s) => s.netValueBoughtCr < 0).slice(-5).reverse();
    const freshEntries = allAccumulated.filter((s) => s.trend === "FRESH_ENTRY");

    const totalNetCapitalCr = allAccumulated.reduce((sum, s) => sum + s.netValueBoughtCr, 0);

    return NextResponse.json({
      stocks: filtered,
      totalCount: filtered.length,
      topAccumulated,
      topTrimmed,
      freshEntries,
      sectorFlows,
      summary: {
        totalNetCapitalCr: Number(totalNetCapitalCr.toFixed(1)),
        fundsTrackedCount: funds.length,
        accumulatedStocksCount: allAccumulated.filter((s) => s.netValueBoughtCr > 0).length,
        trimmedStocksCount: allAccumulated.filter((s) => s.netValueBoughtCr < 0).length,
        disclosureMonth: "September 2026",
      },
    });
  } catch (error) {
    console.error("API /api/funds/accumulation error:", error);
    return NextResponse.json(
      { error: "Failed to compute institutional accumulation radar" },
      { status: 500 }
    );
  }
}
