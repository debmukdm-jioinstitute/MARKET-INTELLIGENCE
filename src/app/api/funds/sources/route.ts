import { NextRequest, NextResponse } from "next/server";
import { AMC_DISCLOSURE_SOURCES, fetchAmfiNavs } from "@/lib/funds/amfi-crawler";
import { getAllMutualFunds } from "@/lib/funds/database";

export async function GET() {
  try {
    const funds = getAllMutualFunds();

    return NextResponse.json({
      sources: AMC_DISCLOSURE_SOURCES,
      totalAmcs: AMC_DISCLOSURE_SOURCES.length,
      sebiMandate: {
        regulation: "SEBI Circular SEBI/HO/IMD/DF2/CIR/P/2018/92 & Master Circular 2024",
        equityFrequency: "Monthly within 10 calendar days of month-end",
        debtFrequency: "Fortnightly (every 15 days) & Monthly",
        derivativesExposure: "Gross exposure capped at 100% of Net Assets",
        halfYearlyDisclosures: "Published on March 31 and September 30 in national newspapers & AMFI website",
      },
      trackedFunds: funds.map((f) => ({
        id: f.id,
        amfiCode: f.amfiCode,
        name: f.shortName,
        amc: f.amc,
        disclosureUrl: f.disclosureUrl,
        disclosureDate: f.disclosureDate,
      })),
      crawler: {
        amfiNavUrl: "https://www.amfiindia.com/spages/NAVAll.txt",
        status: "ONLINE",
        updateIntervalMinutes: 15,
      },
    });
  } catch (error) {
    console.error("API /api/funds/sources error:", error);
    return NextResponse.json({ error: "Failed to fetch disclosure sources" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const navs = await fetchAmfiNavs();
    const count = Object.keys(navs).length;
    return NextResponse.json({
      success: true,
      message: `Synced ${count} NAV records directly from AMFI`,
      sampleNavs: Object.entries(navs).slice(0, 5).map(([code, val]) => ({
        code,
        name: val.name,
        nav: val.nav,
        date: val.date,
      })),
    });
  } catch (error) {
    console.error("POST /api/funds/sources sync error:", error);
    return NextResponse.json({ error: "Failed to sync AMFI NAVs" }, { status: 500 });
  }
}
