import { NextRequest, NextResponse } from "next/server";
import { getMutualFundById } from "@/lib/funds/database";
import { getLatestNavForFund } from "@/lib/funds/amfi-crawler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Fund ID is required" }, { status: 400 });
    }

    const fund = getMutualFundById(id);
    if (!fund) {
      return NextResponse.json(
        { error: `Mutual fund with identifier "${id}" not found` },
        { status: 404 }
      );
    }

    // Live NAV from AMFI NAVAll.txt; null when the fetch fails — never hardcoded.
    const live = await getLatestNavForFund(fund.amfiCode);

    return NextResponse.json({
      fund: {
        id: fund.id,
        amfiCode: fund.amfiCode,
        name: fund.name,
        shortName: fund.shortName,
        amc: fund.amc,
        category: fund.category,
        benchmark: fund.benchmark,
        inceptionDate: fund.inceptionDate,
        disclosureUrl: fund.disclosureUrl,
        nav: live?.nav ?? null,
        navDate: live?.date ?? null,
      },
      navSource: "AMFI NAVAll.txt (live)",
      dataStatus: "NAV_ONLY",
      note: "Portfolio holdings, AUM and analytics are not yet ingested from a verified source. See the AMC's official monthly portfolio disclosure linked above.",
    });
  } catch (error) {
    console.error("API /api/funds/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fund details" },
      { status: 500 }
    );
  }
}
