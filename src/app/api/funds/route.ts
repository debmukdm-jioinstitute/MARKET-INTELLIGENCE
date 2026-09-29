import { NextRequest, NextResponse } from "next/server";
import { getAllMutualFunds, searchMutualFunds, getFundsByCategory } from "@/lib/funds/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q");
    const sortBy = searchParams.get("sortBy") || "aum";

    let funds = getAllMutualFunds();

    if (query && query.trim() !== "") {
      funds = searchMutualFunds(query);
    }

    if (category && category !== "All") {
      funds = funds.filter((f) => f.category === category);
    }

    // Sort
    if (sortBy === "aum") {
      funds = [...funds].sort((a, b) => b.aumCr - a.aumCr);
    } else if (sortBy === "nav") {
      funds = [...funds].sort((a, b) => b.nav - a.nav);
    } else if (sortBy === "name") {
      funds = [...funds].sort((a, b) => a.shortName.localeCompare(b.shortName));
    }

    // Light summary for listing
    const summaries = funds.map((f) => ({
      id: f.id,
      amfiCode: f.amfiCode,
      name: f.name,
      shortName: f.shortName,
      amc: f.amc,
      category: f.category,
      benchmark: f.benchmark,
      aumCr: f.aumCr,
      nav: f.nav,
      navDate: f.navDate,
      expenseRatioPct: f.expenseRatioPct,
      riskRating: f.riskRating,
      top5WeightPct: f.concentration.top5WeightPct,
      top10WeightPct: f.concentration.top10WeightPct,
      totalHoldingsCount: f.concentration.totalHoldingsCount,
      turnoverRatioPct: f.managerBehaviour.turnoverRatioPct,
      managerName: f.managerBehaviour.managerName,
      cashPct: f.concentration.marketCapBreakdown.cashPct,
      top3Holdings: f.holdings.slice(0, 3).map((h) => ({
        symbol: h.symbol,
        weightPct: h.weightPct,
      })),
    }));

    const totalAumCr = funds.reduce((acc, f) => acc + f.aumCr, 0);

    return NextResponse.json({
      funds: summaries,
      totalCount: funds.length,
      totalAumCr: Number(totalAumCr.toFixed(2)),
      totalAumLakhCr: Number((totalAumCr / 100000).toFixed(2)),
      disclosureMonth: "September 2026",
    });
  } catch (error) {
    console.error("API /api/funds error:", error);
    return NextResponse.json({ error: "Failed to fetch mutual funds" }, { status: 500 });
  }
}
