import { NextRequest, NextResponse } from "next/server";
import { getAllMutualFunds, searchMutualFunds } from "@/lib/funds/database";
import { getLatestNavForFund } from "@/lib/funds/amfi-crawler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q");
    const sortBy = searchParams.get("sortBy") || "name";

    let funds = getAllMutualFunds();

    if (query && query.trim() !== "") {
      funds = searchMutualFunds(query);
    }

    if (category && category !== "All") {
      funds = funds.filter((f) => f.category === category);
    }

    // Resolve live NAVs from AMFI NAVAll.txt. If the fetch fails, nav is null —
    // never a hardcoded figure.
    const summaries = await Promise.all(
      funds.map(async (f) => {
        const live = await getLatestNavForFund(f.amfiCode);
        return {
          id: f.id,
          amfiCode: f.amfiCode,
          name: f.name,
          shortName: f.shortName,
          amc: f.amc,
          category: f.category,
          benchmark: f.benchmark,
          inceptionDate: f.inceptionDate,
          disclosureUrl: f.disclosureUrl,
          nav: live?.nav ?? null,
          navDate: live?.date ?? null,
        };
      })
    );

    if (sortBy === "nav") {
      summaries.sort((a, b) => (b.nav ?? -1) - (a.nav ?? -1));
    } else {
      summaries.sort((a, b) => a.shortName.localeCompare(b.shortName));
    }

    return NextResponse.json({
      funds: summaries,
      totalCount: summaries.length,
      navSource: "AMFI NAVAll.txt (live)",
      dataStatus: "NAV_ONLY",
      note: "Scheme identity from our registry; NAV resolved live from AMFI. Portfolio holdings, AUM and performance analytics are not yet ingested from a verified source.",
    });
  } catch (error) {
    console.error("API /api/funds error:", error);
    return NextResponse.json({ error: "Failed to fetch mutual funds" }, { status: 500 });
  }
}
