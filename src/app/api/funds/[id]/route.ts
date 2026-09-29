import { NextRequest, NextResponse } from "next/server";
import { getMutualFundById } from "@/lib/funds/database";

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

    return NextResponse.json({
      fund,
      asOfDate: fund.disclosureDate,
      source: fund.disclosureUrl,
    });
  } catch (error) {
    console.error("API /api/funds/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fund details" },
      { status: 500 }
    );
  }
}
