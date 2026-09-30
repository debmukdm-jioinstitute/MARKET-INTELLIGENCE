import type { PortfolioPromoterRiskAssessment } from "./types";

export interface PortfolioPositionInput {
  symbol: string;
  companyName?: string;
  shares?: number;
  marketValueInr?: number;
  weight?: number; // 0.0 to 1.0 or 0 to 100
}

/**
 * Portfolio promoter / governance risk assessment.
 *
 * There is currently NO live feed for India promoter/insider (SAST/PIT)
 * disclosures, so no pledge, insider-trading, or promoter activity signal can
 * be computed honestly. This function always returns an explicit UNAVAILABLE
 * result with zeroed scores instead of inventing risk flags.
 *
 * Do NOT reintroduce fallback constants (e.g. invented exposure values or
 * default pledge percentages) — fabricated risk scores must never be served.
 */
export function assessPortfolioPromoterRisk(
  positions: PortfolioPositionInput[] = []
): PortfolioPromoterRiskAssessment {
  const scanned = Array.isArray(positions) ? positions.length : 0;
  return {
    dataStatus: "UNAVAILABLE",
    totalHeldPositionsScanned: scanned,
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
      "Promoter and insider disclosure data is not connected to a live source, so governance risk cannot be assessed. Verify promoter activity directly on the NSE/BSE disclosure pages.",
  };
}
