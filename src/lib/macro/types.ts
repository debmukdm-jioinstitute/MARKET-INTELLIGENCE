import type { FieldSource } from "@/lib/feeds/india/types";

export type MacroSectionId =
  | "regime"
  | "growth"
  | "inflation"
  | "rates-liquidity"
  | "fiscal"
  | "consumer"
  | "corporate"
  | "external"
  | "employment"
  | "global";

export type MacroMetric = {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  previous?: number | null;
  change?: number | null;
  history: { date: string; value: number }[];
  source: FieldSource;
  hint?: string;
  children?: MacroMetric[];
};

export type RegimeTone = "positive" | "neutral" | "negative";

export type RegimeDimension =
  | "growth"
  | "inflation"
  | "liquidity"
  | "rates"
  | "fiscal"
  | "external";

export type RegimeSignal = {
  dimension: RegimeDimension;
  label: string;
  status: string;
  tone: RegimeTone;
  emoji: string;
  detail: string;
};

export type MacroRegimeQuadrant = "goldilocks" | "reflation" | "stagflation" | "deflation";

export type RegimeHistoryPoint = {
  date: string;
  quadrant: MacroRegimeQuadrant;
  growthScore: number;
  inflationScore: number;
  label: string;
};

export type MacroRegimeBlock = {
  title: string;
  overall: MacroRegimeQuadrant;
  overallLabel: string;
  signals: RegimeSignal[];
  history: RegimeHistoryPoint[];
  growthInflationChart: { date: string; growth: number; inflation: number }[];
};

export type MacroSectionPayload = {
  id: MacroSectionId;
  title: string;
  subtitle: string;
  metrics: MacroMetric[];
  highlights: string[];
};

export type IndiaMacroHubPayload = {
  fetchedAt: string;
  regime: MacroRegimeBlock;
  sections: Record<MacroSectionId, MacroSectionPayload>;
};
