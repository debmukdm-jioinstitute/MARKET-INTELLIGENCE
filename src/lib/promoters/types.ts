export type PromoterActivityType =
  | "PROMOTER_BUYING"
  | "PROMOTER_SELLING"
  | "PLEDGE_INCREASE"
  | "PLEDGE_DECREASE"
  | "INSIDER_BUYING"
  | "INSIDER_SELLING"
  | "LARGE_SHAREHOLDER_CHANGE"
  | "BLOCK_DEAL"
  | "BULK_DEAL";

export type PersonCategory =
  | "Promoter"
  | "Promoter Group"
  | "Director / KMP"
  | "Large Shareholder"
  | "Institutional / FII"
  | "Marquee HNI";

export type RiskImpact =
  | "HIGH_GOVERNANCE_RISK"
  | "BEARISH_DILUTION"
  | "BULLISH_CONVICTION"
  | "POSITIVE_DELEVERAGING"
  | "NEUTRAL_LIQUIDITY";

export type PromoterActivityRecord = {
  id: string;
  symbol: string;
  companyName: string;
  sector: string;
  category: PromoterActivityType;
  transactionDate: string; // YYYY-MM-DD
  reportingDate: string; // YYYY-MM-DD (SEBI SAST / PIT disclosure date)
  personName: string;
  personCategory: PersonCategory;
  sharesCount: number;
  transactionPriceInr: number;
  transactionValueCr: number; // in ₹ Crores
  stakePctBefore: number; // %
  stakePctAfter: number; // %
  stakePctChange: number; // % (+ for increase, - for decrease)
  pledgePctOfPromoterHolding?: number; // % of promoter holding pledged
  pledgePctOfTotalEquity?: number; // % of company equity pledged
  exchange: "NSE" | "BSE" | "BOTH";
  sourceRegulation: "SEBI PIT Reg 7(2)" | "SEBI SAST Reg 29" | "SEBI SAST Reg 31 (Pledge)" | "NSE Block Window" | "NSE Bulk Window";
  sourceUrl?: string;
  riskImpact: RiskImpact;
  rationale: string;
};

export type FlaggedHoldingRisk = {
  symbol: string;
  companyName: string;
  portfolioWeightPct: number;
  portfolioValueInr: number;
  highestRiskCategory: PromoterActivityType;
  riskSeverity: "CRITICAL" | "WARNING" | "POSITIVE" | "NEUTRAL";
  activeActivities: PromoterActivityRecord[];
  advisoryNote: string;
  pledgeStatus?: {
    pledgePctOfPromoterHolding: number;
    pledgePctOfTotalEquity: number;
    trend: "INCREASED" | "DECREASED" | "UNCHANGED";
  };
};

export type PortfolioPromoterRiskAssessment = {
  totalHeldPositionsScanned: number;
  positionsWithFlagsCount: number;
  overallGovernanceRiskScore: number; // 0 (Prudently clean) to 100 (Severe governance / pledge hazard)
  governanceRiskGrade: "LOW" | "MODERATE" | "ELEVATED" | "HIGH_PLEDGE_RISK";
  pledgeRiskExposureCr: number;
  promoterSellingExposureCr: number;
  promoterBuyingSupportCr: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  positiveSignalsCount: number;
  flaggedHoldings: FlaggedHoldingRisk[];
  recommendationSummary: string;
};
