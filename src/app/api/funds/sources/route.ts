import { NextResponse } from "next/server";
import { AMC_DISCLOSURE_SOURCES } from "@/lib/funds/amfi-crawler";
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
      })),
      navFeed: {
        amfiNavUrl: "https://www.amfiindia.com/spages/NAVAll.txt",
        note: "NAVs are fetched live on demand (15-minute cache) by /api/funds and /api/funds/[id]. This route does not persist data.",
      },
    });
  } catch (error) {
    console.error("API /api/funds/sources error:", error);
    return NextResponse.json({ error: "Failed to fetch disclosure sources" }, { status: 500 });
  }
}
