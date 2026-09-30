export type MarketCapCategory = "LARGE_CAP" | "MID_CAP" | "SMALL_CAP";

export type CreditRatingAgency =
  | "CRISIL"
  | "ICRA"
  | "CARE Ratings"
  | "India Ratings"
  | "Acuité"
  | "Brickwork";

export type CreditEventAction =
  | "RATING_UPGRADE"
  | "RATING_DOWNGRADE"
  | "OUTLOOK_CHANGE"
  | "CREDIT_WATCH"
  | "DEFAULT"
  | "DEBT_RESTRUCTURING"
  | "LIQUIDITY_CONCERN";

export type CreditOutlook =
  | "Stable"
  | "Positive"
  | "Negative"
  | "Watch Negative"
  | "Watch Developing"
  | "Watch Positive"
  | "Under Review";

export type LiquidityCategory =
  | "Superior"
  | "Strong"
  | "Adequate"
  | "Stretched"
  | "Poor"
  | "Critical Deficit";

export type EquityTransmissionType =
  | "IMMEDIATE_PRICED_IN"
  | "EQUITY_LAGGED"
  | "OVERREACTION"
  | "CONVICTION_RALLY"
  | "DELEVERAGING_EXPANSION"
  | "DISTRESS_DISCOUNT";

export type EquityConnection = {
  currentPriceInr: number;
  priceAtActionInr: number;
  equityReturnSinceActionPct: number; // % return since rating action
  equity1DayReturnPct: number; // immediate 1-day price reaction
  equity1MonthReturnPct: number;
  marketCapCr: number;
  impliedCreditSpreadBps: number; // Credit spread over 10Y Indian G-Sec in bps
  transmission: EquityTransmissionType;
  equityImpactAnalysis: string; // Explaining PE re-rating/derating, borrowing cost impact, margin shifts
};

export type CreditActivityRecord = {
  id: string;
  symbol: string;
  companyName: string;
  sector: string;
  marketCapCategory?: MarketCapCategory;
  agency: CreditRatingAgency;
  action: CreditEventAction;
  actionDate: string; // YYYY-MM-DD
  ratingBefore: string;
  ratingAfter: string;
  outlookBefore: CreditOutlook;
  outlookAfter: CreditOutlook;
  instrument: string; // e.g. "Long-Term Bank Facilities", "NCDs", "Commercial Paper"
  ratedDebtAmountCr: number; // Debt quantum rated in ₹ Crores
  liquidityAssessment: LiquidityCategory;
  keyDrivers: string[];
  agencyRationale: string;
  equityConnection: EquityConnection;
  sourceUrl?: string;
};

export type FlaggedCreditHolding = {
  symbol: string;
  companyName: string;
  portfolioWeightPct: number;
  portfolioValueInr: number;
  creditRating: string;
  agency: CreditRatingAgency;
  latestAction: CreditEventAction;
  actionSeverity: "CRITICAL" | "WARNING" | "POSITIVE" | "NEUTRAL";
  liquidityStatus: LiquidityCategory;
  advisoryNote: string;
  equityTransmission: EquityTransmissionType;
  sourceUrl?: string;
  actionDate?: string;
};

export type PortfolioCreditRiskAssessment = {
  totalHeldPositionsScanned: number;
  positionsWithCreditEventsCount: number;
  portfolioCreditHealthScore: number; // 0 to 100 (100 = AAA / Prudent, < 40 = Elevated Debt Distress)
  creditHealthGrade: "AAA_PRUDENT" | "INVESTMENT_GRADE" | "WATCH_EXPOSURE" | "HIGH_CREDIT_DISTRESS";
  holdingsWithDowngradeCount: number;
  holdingsWithUpgradeCount: number;
  holdingsWithLiquidityConcernsCount: number;
  capitalInDowngradedDebtCr: number;
  capitalInUpgradedDebtCr: number;
  flaggedHoldings: FlaggedCreditHolding[];
  portfolioCreditSummary: string;
};

export type SmallcapFundFlaggedHolding = {
  symbol: string;
  companyName: string;
  weightPct: number;
  rating: string;
  agency: CreditRatingAgency;
  creditStatus: string;
  issue: string;
};

export type SmallcapFundCreditProfile = {
  id: string;
  fundName: string;
  amc: string;
  aumCr: number;
  category: "Small Cap Fund";
  cashAndSovereignPct: number;
  highGradeDebtPct: number;
  moderateGradeDebtPct: number;
  portfolioCreditScore: number;
  creditHealthGrade: "AAA_PRUDENT" | "INVESTMENT_GRADE" | "WATCH_EXPOSURE" | "HIGH_CREDIT_DISTRESS";
  liquidityStressDays20Pct: number;
  liquidityStressDays50Pct: number;
  flaggedHoldingsCount: number;
  flaggedHoldings: SmallcapFundFlaggedHolding[];
  creditRiskSummary: string;
};
