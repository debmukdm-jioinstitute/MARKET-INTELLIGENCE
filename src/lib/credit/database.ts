import type {
  CreditActivityRecord,
  PortfolioCreditRiskAssessment,
  SmallcapFundCreditProfile,
} from "./types";

/**
 * Credit-rating data — honest "not connected" state.
 *
 * Previously this module shipped a hardcoded list of credit-rating actions
 * attributed to real agencies (CRISIL, ICRA, CARE, India Ratings, Acuite,
 * Brickwork) with invented dates, ratings, rationales, and equity-impact
 * commentary. That data was fabricated and has been removed under the
 * site's zero-fabricated-data rule.
 *
 * There is currently NO live credit-rating feed: Indian rating agencies
 * publish press releases on their own portals and offer no free
 * rating-action API or RSS. Until a verified collector exists, every
 * accessor below returns an honest empty result and the risk engine
 * reports dataStatus "UNAVAILABLE".
 *
 * Real agency portals (for manual verification) live in
 * src/lib/intelligence/verification-links.ts (CREDIT_AGENCY_PORTALS).
 */

export const CREDIT_DATA_STATUS = "UNAVAILABLE" as const;

export type CreditDataAvailability = {
  dataStatus: "AVAILABLE" | "UNAVAILABLE";
  message: string;
};

export function getCreditDataAvailability(): CreditDataAvailability {
  return {
    dataStatus: "UNAVAILABLE",
    message:
      "Credit rating actions are not wired to a live agency feed yet. No rating actions are shown rather than estimates.",
  };
}

export function getAllCreditActivities(): CreditActivityRecord[] {
  return [];
}

export function filterCreditActivities(_filters?: {
  agency?: string;
  action?: string;
  sector?: string;
  symbol?: string;
  marketCap?: string;
  search?: string;
}): CreditActivityRecord[] {
  return [];
}

export function getCreditActivityBySymbol(_symbol: string): CreditActivityRecord[] {
  return [];
}

export function getSmallcapFundsCreditProfiles(): SmallcapFundCreditProfile[] {
  return [];
}

export function filterSmallcapFundsCreditProfiles(_query?: string): SmallcapFundCreditProfile[] {
  return [];
}

/**
 * Portfolio credit-risk assessment — honest unavailable state.
 *
 * Without a live rating-action feed there is no honest input to score
 * against, so this always returns dataStatus "UNAVAILABLE" with zeroed
 * fields and never invents a health grade. Callers MUST check `dataStatus`
 * before rendering any score or grade.
 */
export type PortfolioCreditRiskResult = PortfolioCreditRiskAssessment & {
  dataStatus: "UNAVAILABLE";
  message: string;
};

export function assessPortfolioCreditRisk(
  positions: { symbol: string; companyName?: string; weight?: number; marketValueInr?: number }[] = []
): PortfolioCreditRiskResult {
  return {
    dataStatus: "UNAVAILABLE",
    message:
      "Credit rating feed not connected — no agency rating actions are available, so no credit-risk score is computed.",
    totalHeldPositionsScanned: positions.length,
    positionsWithCreditEventsCount: 0,
    portfolioCreditHealthScore: 0,
    creditHealthGrade: "INVESTMENT_GRADE",
    holdingsWithDowngradeCount: 0,
    holdingsWithUpgradeCount: 0,
    holdingsWithLiquidityConcernsCount: 0,
    capitalInDowngradedDebtCr: 0,
    capitalInUpgradedDebtCr: 0,
    flaggedHoldings: [],
    portfolioCreditSummary:
      "Credit-risk scoring is unavailable — the rating-agency feed is not connected. Verify ratings directly on the agency portals.",
  };
}
