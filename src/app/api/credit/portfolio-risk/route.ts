import { NextRequest, NextResponse } from "next/server";
import { assessPortfolioCreditRisk } from "@/lib/credit/database";

/**
 * POST /api/credit/portfolio-risk
 *
 * Honest unavailable state: without a live rating-action feed there is no
 * honest input to score against, so no credit-risk score is computed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const positions = body.positions || [];

    const riskAssessment = assessPortfolioCreditRisk(positions);

    return NextResponse.json(riskAssessment);
  } catch (error) {
    console.error("API /api/credit/portfolio-risk error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate portfolio credit risk" },
      { status: 500 }
    );
  }
}
