import type { FieldSource } from "@/lib/feeds/india/types";
import type { StockAccumulationSummary } from "@/lib/funds/types";

export type FlowDirection = "up" | "down" | "neutral" | "na";

export type InstitutionalSignal = {
  id: string;
  label: string;
  direction: FlowDirection;
  headline: string;
  detail: string;
  href?: string;
};

export type TrackerCoverage = "live" | "partial" | "planned";

export type InstitutionalTracker = {
  id: string;
  label: string;
  coverage: TrackerCoverage;
  summary: string;
  flows?: { todayCr?: number | null; m1Cr?: number | null; ytdCr?: number | null };
  sources: FieldSource[];
  href?: string;
};

export type MoneyFlowLeg = {
  label: string;
  today: number | null;
  d5: number | null;
  m1: number | null;
  ytd: number | null;
  source: FieldSource;
};

export type InstitutionalIntelligencePayload = {
  fetchedAt: string;
  smartMoney: {
    score: number;
    label: string;
    summary: string;
  };
  signals: InstitutionalSignal[];
  trackers: InstitutionalTracker[];
  moneyFlow: {
    fii: MoneyFlowLeg;
    dii: MoneyFlowLeg;
  };
  mutualFunds: {
    disclosureMonth: string;
    totalNetCapitalCr: number;
    fundsTrackedCount: number;
    accumulatedStocksCount: number;
    trimmedStocksCount: number;
    topAccumulated: StockAccumulationSummary[];
    topTrimmed: StockAccumulationSummary[];
    sectorFlows: { sector: string; netInflowCr: number; buyingCount: number; sellingCount: number }[];
  };
  sourceCatalog: { id: string; label: string; url: string; role: string }[];
};
