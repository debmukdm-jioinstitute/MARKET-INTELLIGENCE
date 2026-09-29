export type IrDocumentCategory =
  | "INVESTOR_PRESENTATION"
  | "EARNINGS_RELEASE"
  | "ANNUAL_REPORT"
  | "ESG_REPORT"
  | "PRESS_RELEASE"
  | "MANAGEMENT_COMMENTARY"
  | "EVENTS"
  | "CONCALL_MATERIALS";

export interface IrDocument {
  id: string;
  category: IrDocumentCategory;
  title: string;
  periodOrDate: string;
  fileType: "PDF" | "AUDIO" | "TRANSCRIPT" | "WEB" | "XLSX";
  fileSizeMb?: number;
  url: string;
  summary: string;
  highlights: string[];
}

export type TimelineEventType =
  | "REGULATORY_FILING"
  | "INVESTOR_PRESENTATION"
  | "CREDIT_RATING"
  | "MANAGEMENT_COMMENTARY"
  | "ACQUISITION_MNA"
  | "PRODUCTION_UPDATE"
  | "EARNINGS_CONCALL"
  | "ESG_DISCLOSURE"
  | "ANNUAL_REPORT"
  | "DIVIDEND_CAPITAL";

export type EventImpactTier = "HIGH_IMPACT" | "STRATEGIC" | "ROUTINE";

export interface CompanyTimelineEvent {
  id: string;
  symbol: string;
  date: string; // ISO date YYYY-MM-DD
  displayDate: string; // e.g. "29 Sep"
  type: TimelineEventType;
  impact: EventImpactTier;
  headline: string;
  summary: string;
  keyMetrics?: {
    label: string;
    value: string;
    sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  }[];
  sourceUrl?: string;
  sourceDocLabel?: string;
}

export interface WhatChangedDimension {
  dimension: string;
  priorQuarter: string;
  currentQuarter: string;
  verdict: "UPGRADE" | "DOWNGRADE" | "MAINTAINED" | "PIVOT";
  changeNarrative: string;
  confidenceScore: number; // 0 - 100
}

export interface WhatChangedSummary {
  period: string; // e.g. "Q1 FY26 vs Q4 FY25"
  executiveSynthesis: string;
  netDirection: "POSITIVE_INFLECTION" | "NEUTRAL_EXECUTION" | "CAUTIONARY_HEADWINDS";
  dimensions: WhatChangedDimension[];
  catalystsToWatch: string[];
  keyRiskAlerts: string[];
}

export type ManagementTone = "BULLISH" | "OPTIMISTIC" | "NEUTRAL" | "CAUTIOUS" | "DEFENSIVE";

export interface ConcallDimensionAnalysis {
  managementConfidence: {
    score: number; // 0 - 100
    stance: ManagementTone;
    rationale: string;
  };
  revenueOutlook: {
    targetGrowthPct: string;
    commentary: string;
    stance: "POSITIVE" | "NEUTRAL" | "MUTED";
  };
  marginOutlook: {
    targetMarginPct: string;
    headwinds: string[];
    tailwinds: string[];
    stance: "EXPANDING" | "STABLE" | "CONTRACTING";
  };
  capex: {
    outlayInrCr: number;
    allocationFocus: string;
    debtImpact: string;
  };
  demand: {
    environment: "STRONG" | "STEADY" | "WEAKENING";
    details: string;
  };
  pricing: {
    pricingPower: "HIGH" | "MODERATE" | "CONSTRAINED";
    discountsCommentary: string;
  };
  competition: {
    intensity: "ELEVATED" | "STABLE" | "FAVORABLE";
    marketShareShift: string;
  };
  commodityCosts: {
    trend: "HEADWIND" | "BENIGN" | "TAILWIND";
    impactedSegments: string[];
  };
  hiring: {
    headcountTrend: "EXPANDING" | "STABLE" | "RATIONALIZING";
    wageInflationPct: string;
  };
  expansion: {
    status: string;
    targetMilestoneDate: string;
  };
  guidanceChanges: {
    status: "RAISED" | "MAINTAINED" | "LOWERED";
    details: string;
  };
}

export interface AnalystQAItem {
  id: string;
  analystName: string;
  firm: string;
  question: string;
  managementSpeaker: string;
  answerSummary: string;
  verbatimExcerpt: string;
  tone: "CONFIDENT" | "GUARDED" | "CONCILIATORY";
  materiality: "HIGH" | "MEDIUM";
}

export interface ConcallQuarterReport {
  id: string;
  quarter: string;
  date: string;
  audioDurationMin?: number;
  participants: { name: string; designation: string }[];
  headlineVerdict: string;
  dimensions: ConcallDimensionAnalysis;
  analystQA: AnalystQAItem[];
}

export interface HistoricalToneQuarter {
  quarter: string;
  date: string;
  score: number; // 0 - 100
  tone: ManagementTone;
  keyTheme: string;
  revenueBeatMiss: "BEAT" | "IN_LINE" | "MISS";
  marginBeatMiss: "BEAT" | "IN_LINE" | "MISS";
}

export interface CompanyIntelligenceProfile {
  symbol: string;
  companyName: string;
  sector: string;
  marketCapTier: "LARGE_CAP" | "MID_CAP" | "EMERGING";
  irBaseUrl: string;
  irDocuments: IrDocument[];
  timeline: CompanyTimelineEvent[];
  whatChanged: WhatChangedSummary;
  latestConcall: ConcallQuarterReport;
  historicalToneTrajectory: HistoricalToneQuarter[];
}
