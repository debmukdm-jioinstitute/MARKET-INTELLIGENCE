import { NextResponse } from "next/server";
import {
  getCompanyIntelligenceProfile,
  getFeaturedIntelligenceSymbols,
} from "@/lib/company-intelligence/database";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol")?.toUpperCase() || "TATAMOTORS";
    const profile = getCompanyIntelligenceProfile(symbol);
    const featured = getFeaturedIntelligenceSymbols();

    return NextResponse.json({
      success: true,
      profile,
      featured,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch company intelligence",
      },
      { status: 500 }
    );
  }
}
