export type FundCategory =
  | "Flexi Cap"
  | "Large Cap"
  | "Mid Cap"
  | "Small Cap"
  | "Multi Cap"
  | "Value / Contra"
  | "Focused"
  | "ELSS (Tax Saver)"
  | "Sectoral / Thematic"
  | "Index / Passive"
  | "Hybrid / Balanced";

export type MarketCapCategory = "Large Cap" | "Mid Cap" | "Small Cap";

export type HoldingChangeStatus =
  | "ACCUMULATED"
  | "TRIMMED"
  | "NEW"
  | "EXIT"
  | "UNCHANGED";

export type FundHolding = {
  symbol: string;
  name: string;
  isin: string;
  sector: string;
  weightPct: number; // e.g. 7.42%
  shares: number; // e.g. 14,500,000
  marketValueCr: number; // in ₹ Crores, e.g. 3850.5
  marketCapCategory: MarketCapCategory;
  changeStatus: HoldingChangeStatus;
  sharesChangePct: number; // e.g. +14.5% or -5.2%
  sharesChangeCount?: number;
  prevShares?: number;
  currentPriceInr?: number;
};

export type SectorExposure = {
  sector: string;
  weightPct: number;
  benchmarkWeightPct: number;
  diffPct: number; // weightPct - benchmarkWeightPct
};

export type FactorExposure = {
  factor: "Value" | "Growth" | "Quality" | "Momentum" | "Low Volatility" | "Size Tilt";
  score: number; // -2.0 to +2.0
  label: string; // e.g. "High Quality Tilt", "Moderate Growth"
  percentile: number; // 0 to 100
  description: string;
};

export type ConcentrationMetrics = {
  top5WeightPct: number;
  top10WeightPct: number;
  totalHoldingsCount: number;
  hhi: number; // Herfindahl index (e.g. 320)
  effectiveNumStocks: number; // 1 / (HHI / 10000)
  marketCapBreakdown: {
    largeCapPct: number;
    midCapPct: number;
    smallCapPct: number;
    cashPct: number;
  };
};

export type PortfolioChangesMoM = {
  month: string; // e.g. "September 2026"
  newEntries: FundHolding[];
  completeExits: FundHolding[];
  accumulated: FundHolding[];
  trimmed: FundHolding[];
};

export type ManagerBehaviour = {
  managerName: string;
  managerTenureYears: number;
  turnoverRatioPct: number; // e.g. 18%
  activeSharePct: number; // e.g. 78%
  cashStance: {
    currentCashPct: number;
    cashTrend: "INCREASING" | "DECREASING" | "STABLE";
    cashHistory: { month: string; cashPct: number }[];
  };
  convictionBets: {
    symbol: string;
    name: string;
    fundWeightPct: number;
    benchmarkWeightPct: number;
    activeWeightPct: number;
    rationale: string;
  }[];
  philosophy: string;
};

export type MutualFund = {
  id: string;
  amfiCode: string;
  name: string;
  shortName: string;
  amc: string;
  category: FundCategory;
  benchmark: string;
  aumCr: number; // in ₹ Crores
  nav: number; // NAV in ₹
  navDate: string;
  expenseRatioPct: number;
  riskRating: "Very High" | "High" | "Moderate" | "Moderately High";
  inceptionDate: string;
  holdings: FundHolding[];
  sectorExposure: SectorExposure[];
  factorExposure: FactorExposure[];
  concentration: ConcentrationMetrics;
  changesMoM: PortfolioChangesMoM;
  managerBehaviour: ManagerBehaviour;
  disclosureDate: string;
  disclosureUrl: string;
};

export type StockAccumulationSummary = {
  symbol: string;
  name: string;
  isin: string;
  sector: string;
  marketCapCategory: MarketCapCategory;
  netValueBoughtCr: number; // ₹ Crores added across all funds this month
  netSharesChangePct: number; // % increase in institutional shares held
  fundsBuyingCount: number;
  fundsSellingCount: number;
  totalFundsHolding: number;
  totalInstitutionalAumCr: number;
  topBuyers: {
    fundId: string;
    fundName: string;
    sharesAdded: number;
    valueAddedCr: number;
    currentWeightPct: number;
  }[];
  topSellers: {
    fundId: string;
    fundName: string;
    sharesSold: number;
    valueSoldCr: number;
    currentWeightPct: number;
  }[];
  trend:
    | "HEAVY_ACCUMULATION"
    | "MODERATE_BUYING"
    | "NEUTRAL"
    | "TRIMMING"
    | "HEAVY_DUMPING"
    | "FRESH_ENTRY";
};

export type OverlapResult = {
  fundA: { id: string; name: string; shortName: string; category: string; aumCr: number };
  fundB: { id: string; name: string; shortName: string; category: string; aumCr: number };
  overlapPct: number; // Sum of min(weightA, weightB)
  commonHoldingsCount: number;
  fundAUniqueCount: number;
  fundBUniqueCount: number;
  commonHoldings: {
    symbol: string;
    name: string;
    sector: string;
    weightA: number;
    weightB: number;
    minWeight: number;
  }[];
  fundAUniqueHoldings: FundHolding[];
  fundBUniqueHoldings: FundHolding[];
  sectorComparison: {
    sector: string;
    weightA: number;
    weightB: number;
    diff: number;
  }[];
};
