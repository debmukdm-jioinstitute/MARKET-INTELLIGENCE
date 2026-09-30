import { NextRequest, NextResponse } from "next/server";
import { getAllCreditActivities, filterCreditActivities, getSmallcapFundsCreditProfiles } from "@/lib/credit/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agency = searchParams.get("agency") || undefined;
    const action = searchParams.get("action") || undefined;
    const sector = searchParams.get("sector") || undefined;
    const symbol = searchParams.get("symbol") || undefined;
    const marketCap = searchParams.get("marketCap") || searchParams.get("cap") || undefined;
    const search = searchParams.get("search") || searchParams.get("q") || undefined;

    const all = getAllCreditActivities();
    const filtered = filterCreditActivities({
      agency,
      action,
      sector,
      symbol,
      marketCap,
      search,
    });

    let upgrades = 0;
    let downgrades = 0;
    let watches = 0;
    let defaults = 0;
    let liquidityAlerts = 0;
    let totalRatedDebt = 0;

    for (const item of all) {
      totalRatedDebt += item.ratedDebtAmountCr;
      if (item.action === "RATING_UPGRADE") upgrades += 1;
      else if (item.action === "RATING_DOWNGRADE") downgrades += 1;
      else if (item.action === "CREDIT_WATCH") watches += 1;
      else if (item.action === "DEFAULT") defaults += 1;
      else if (item.action === "LIQUIDITY_CONCERN") liquidityAlerts += 1;
    }

    const migrationRatio = downgrades > 0 ? Number((upgrades / downgrades).toFixed(2)) : upgrades;
    const netCreditStance =
      upgrades > downgrades ? "CREDIT_UPGRADE_CYCLE" : downgrades > upgrades ? "CREDIT_STRESS" : "NEUTRAL";

    return NextResponse.json({
      activities: filtered,
      smallcapFunds: getSmallcapFundsCreditProfiles(),
      totalCount: filtered.length,
      summary: {
        totalActionsTracked: all.length,
        upgradesCount: upgrades,
        downgradesCount: downgrades,
        creditWatchCount: watches,
        defaultsCount: defaults,
        liquidityConcernsCount: liquidityAlerts,
        totalRatedDebtCr: Number(totalRatedDebt.toFixed(1)),
        creditMigrationRatio: migrationRatio,
        netCreditStance,
        reportingPeriod: "September 2026 Disclosures",
      },
    });
  } catch (error) {
    console.error("API /api/credit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit activities" },
      { status: 500 }
    );
  }
}
