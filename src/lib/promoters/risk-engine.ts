import type { PortfolioPromoterRiskAssessment } from "./types";

export interface PortfolioPositionInput {
  symbol: string;
  companyName?: string;
  shares?: number;
  marketValueInr?: number;
  weight?: number; // 0.0 to 1.0 or 0 to 100
}

/**
 * Portfolio promoter-risk assessment.
 *
 * No live promoter/pledge/insider disclosure feed is connected, so this
 * returns an explicit UNAVAILABLE assessment with zeroed figures instead of
 * invented risk scores. Wire a real disclosure source before scoring.
 */
export function assessPortfolioPromoterRisk(
  positions: PortfolioPositionInput[] = []
): PortfolioPromoterRiskAssessment {
  return {
    dataStatus: "UNAVAILABLE",
    totalHeldPositionsScanned: positions.length,
    positionsWithFlagsCount: 0,
    overallGovernanceRiskScore: 0,
    governanceRiskGrade: "LOW",
    pledgeRiskExposureCr: 0,
    promoterSellingExposureCr: 0,
    promoterBuyingSupportCr: 0,
    criticalAlertsCount: 0,
    warningAlertsCount: 0,
    positiveSignalsCount: 0,
    flaggedHoldings: [],
    recommendationSummary:
      "Promoter disclosure feed is not connected — no promoter, pledge, or insider activity data is available, so risk figures are zeroed rather than estimated.",
  };
}
