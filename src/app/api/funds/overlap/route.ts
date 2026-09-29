import { NextRequest, NextResponse } from "next/server";
import { getMutualFundById, getAllMutualFunds } from "@/lib/funds/database";
import { calculateFundOverlap } from "@/lib/funds/analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idA = searchParams.get("fundA");
    const idB = searchParams.get("fundB");

    const allFunds = getAllMutualFunds();

    if (!idA || !idB) {
      // Default to first two funds if not provided
      const defaultA = allFunds[0];
      const defaultB = allFunds[3] || allFunds[1];
      const result = calculateFundOverlap(defaultA, defaultB);
      return NextResponse.json({
        ...result,
        availableFunds: allFunds.map((f) => ({
          id: f.id,
          name: f.name,
          shortName: f.shortName,
          category: f.category,
        })),
      });
    }

    const fundA = getMutualFundById(idA);
    const fundB = getMutualFundById(idB);

    if (!fundA) {
      return NextResponse.json({ error: `Fund A not found: ${idA}` }, { status: 404 });
    }
    if (!fundB) {
      return NextResponse.json({ error: `Fund B not found: ${idB}` }, { status: 404 });
    }

    const result = calculateFundOverlap(fundA, fundB);

    return NextResponse.json({
      ...result,
      availableFunds: allFunds.map((f) => ({
        id: f.id,
        name: f.name,
        shortName: f.shortName,
        category: f.category,
      })),
    });
  } catch (error) {
    console.error("API /api/funds/overlap error:", error);
    return NextResponse.json(
      { error: "Failed to calculate fund overlap" },
      { status: 500 }
    );
  }
}
