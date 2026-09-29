import { NextResponse } from "next/server";
import { getCompanyConsensusIntelligence } from "@/lib/broker-research/database";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "RELIANCE";
    const consensus = getCompanyConsensusIntelligence(symbol);

    return NextResponse.json({
      success: true,
      consensus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch consensus intelligence",
      },
      { status: 500 }
    );
  }
}
