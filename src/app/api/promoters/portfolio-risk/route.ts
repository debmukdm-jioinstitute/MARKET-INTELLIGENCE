import { NextRequest, NextResponse } from "next/server";
import { assessPortfolioPromoterRisk } from "@/lib/promoters/risk-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const positions = body.positions || [];

    const riskAssessment = assessPortfolioPromoterRisk(positions);

    return NextResponse.json(riskAssessment);
  } catch (error) {
    console.error("API /api/promoters/portfolio-risk error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate portfolio promoter risk" },
      { status: 500 }
    );
  }
}
