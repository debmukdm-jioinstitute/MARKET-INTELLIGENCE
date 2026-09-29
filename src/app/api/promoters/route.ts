import { NextRequest, NextResponse } from "next/server";
import { getAllPromoterActivities, filterPromoterActivities } from "@/lib/promoters/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const sector = searchParams.get("sector") || undefined;
    const symbol = searchParams.get("symbol") || undefined;
    const riskImpact = searchParams.get("riskImpact") || undefined;
    const search = searchParams.get("search") || searchParams.get("q") || undefined;

    const all = getAllPromoterActivities();
    const filtered = filterPromoterActivities({
      category,
      sector,
      symbol,
      riskImpact,
      search,
    });

    // Summary calculations
    let totalBuyingValueCr = 0;
    let totalSellingValueCr = 0;
    let pledgeAlertsCount = 0;
    let blockDealsValueCr = 0;
    let bulkDealsValueCr = 0;

    for (const act of all) {
      if (act.category === "PROMOTER_BUYING" || act.category === "INSIDER_BUYING") {
        totalBuyingValueCr += act.transactionValueCr;
      } else if (act.category === "PROMOTER_SELLING" || act.category === "INSIDER_SELLING") {
        totalSellingValueCr += act.transactionValueCr;
      }

      if (act.category === "PLEDGE_INCREASE") {
        pledgeAlertsCount += 1;
      }
      if (act.category === "BLOCK_DEAL") {
        blockDealsValueCr += act.transactionValueCr;
      }
      if (act.category === "BULK_DEAL") {
        bulkDealsValueCr += act.transactionValueCr;
      }
    }

    const netPromoterSentiment =
      totalBuyingValueCr > totalSellingValueCr * 1.2
        ? "BULLISH_NET_BUYING"
        : totalSellingValueCr > totalBuyingValueCr * 1.2
        ? "BEARISH_NET_SELLING"
        : "NEUTRAL";

    return NextResponse.json({
      activities: filtered,
      totalCount: filtered.length,
      summary: {
        totalTransactions: all.length,
        totalBuyingValueCr: Number(totalBuyingValueCr.toFixed(1)),
        totalSellingValueCr: Number(totalSellingValueCr.toFixed(1)),
        netFlowCr: Number((totalBuyingValueCr - totalSellingValueCr).toFixed(1)),
        pledgeAlertsCount,
        blockDealsValueCr: Number(blockDealsValueCr.toFixed(1)),
        bulkDealsValueCr: Number(bulkDealsValueCr.toFixed(1)),
        netPromoterSentiment,
        reportingPeriod: "September 2026 Disclosures",
      },
    });
  } catch (error) {
    console.error("API /api/promoters error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promoter activities" },
      { status: 500 }
    );
  }
}
