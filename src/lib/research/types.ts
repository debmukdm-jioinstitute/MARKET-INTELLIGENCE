export type RecoLabel = "BUY" | "ACCUMULATE" | "HOLD" | "SELL";

export type IpoReviewConsensus = {
  apply: number;
  mayApply: number;
  neutral: number;
  avoid: number;
  notRated: number;
  /** apply − avoid; higher = more bullish desk. */
  netScore: number;
};

export type ScrapedReport = {
  broker: string | null;
  title: string;
  url: string;
  pdfUrl?: string | null;
  symbol?: string | null;
  recommendation?: string | null;
  targetPrice?: number | null;
  cmp?: number | null;
  upsidePct?: number | null;
  reportType?: string | null;
  summary: string | null;
  publishedAt: string | null;
  extra?: Record<string, unknown> | null;
};

export type ResearchSource = {
  key: string;
  label: string;
  tier: "pdf" | "broker_call" | "consensus" | "media";
  fetchReports: () => Promise<ScrapedReport[]>;
};

export type NormalizedReport = ScrapedReport & {
  recommendation: RecoLabel | null;
  upsidePct: number | null;
  symbol: string | null;
};
