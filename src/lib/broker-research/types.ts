export type InstitutionalBroker =
  | "Motilal Oswal"
  | "ICICI Securities"
  | "HDFC Securities"
  | "Kotak Securities"
  | "Axis Securities"
  | "Emkay Global"
  | "JM Financial"
  | "Nuvama"
  | "Prabhudas Lilladher"
  | "Yes Securities"
  | "IIFL Securities";

export type ResearchRating = "BUY" | "ACCUMULATE" | "HOLD" | "REDUCE" | "SELL";

export type TargetChangeType =
  | "TARGET_RAISED"
  | "TARGET_CUT"
  | "UPGRADED_RATING"
  | "DOWNGRADED_RATING"
  | "MAINTAINED"
  | "INITIATED";

export interface FinancialEstimates {
  fiscalYear: string; // e.g. "FY26E"
  revenueInrCr: number;
  revenueGrowthYoY: number; // percentage
  ebitdaInrCr: number;
  ebitdaMarginPct: number;
  epsInr: number;
  peRatio: number;
  rocePct?: number;
}

export interface BrokerResearchReport {
  id: string;
  broker: InstitutionalBroker;
  analyst: string;
  companyName: string;
  symbol: string;
  rating: ResearchRating;
  targetPrice: number;
  previousTarget: number;
  targetChangePct: number;
  changeType: TargetChangeType;
  cmp: number;
  upsidePct: number;
  thesis: string;
  estimates: FinancialEstimates[];
  keyRisks: string[];
  catalysts: string[];
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "28 Sep 2026"
  reportTitle: string;
  reportPdfUrl?: string;
  sourcePortalUrl: string;
}

export interface ConsensusShiftFactor {
  title: string;
  description: string;
  impactType: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  metricImpact: string; // e.g. "+₹14 ARPU shift adding +11% to FY26E EBITDA"
}

export interface ConsensusWhyChangedSynthesis {
  timeframe: string; // e.g. "Past 30 Days"
  headline: string;
  summary: string;
  netTargetShiftPct: number; // e.g. +8.4%
  upgradesCount: number;
  downgradesCount: number;
  maintainedCount: number;
  drivers: ConsensusShiftFactor[];
  skepticView: string; // Why remaining HOLDs haven't upgraded yet
  consensusInflectionVerdict: "STRONG_BULLISH_RERATING" | "SELECTIVE_UPGRADES" | "CONSENSUS_DIVIDED" | "DOWNGRADE_CYCLE";
}

export interface CompanyConsensusIntelligence {
  symbol: string;
  companyName: string;
  sector: string;
  cmp: number;
  totalBrokersCovering: number;
  buyCount: number;
  accumulateCount: number;
  holdCount: number;
  sellCount: number;
  buyRatioPct: number;
  consensusTargetPrice: number;
  consensusUpsidePct: number;
  targetPriceHigh: number;
  brokerHigh: InstitutionalBroker;
  targetPriceLow: number;
  brokerLow: InstitutionalBroker;
  targetSpreadPct: number;
  brokerMatrix: BrokerResearchReport[];
  whyChanged: ConsensusWhyChangedSynthesis;
}

export interface BrokerSourceMeta {
  broker: InstitutionalBroker;
  portalName: string;
  url: string;
  institutionalDeskFocus: string;
  activeCoverageCount: number;
}
