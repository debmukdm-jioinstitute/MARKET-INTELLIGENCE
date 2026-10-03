"use client";

import type { FieldSource } from "@/lib/feeds/india/types";

export type SourcedField<T> =
  | { status: "ok"; value: T; source: FieldSource }
  | { status: "unavailable"; reason: string };

export type OptionsFlowRecord = {
  symbol: string;
  name: string;
  price: SourcedField<number>;
  priceChangePct: SourcedField<number>;
  volume: SourcedField<number>;
  volumeAvg30: SourcedField<number>;
  callsVolume: SourcedField<number>;
  putsVolume: SourcedField<number>;
  activeStrikeOiChanges: SourcedField<
    { strike: number; side: "call" | "put"; oi: number; prevOi: number; change: number }[]
  >;
  earningsEvent: SourcedField<string>;
  corporateActionEvent: SourcedField<string>;
};

export type AnalysisOutput = {
  symbol: string;
  volumeVsRange: string;
  callPutRatioNote: string;
  openInterestNote: string;
  priceConfirmationNote: string;
  scheduledEventNote: string;
  flagged: boolean;
  uncertaintyNote: string;
  unusualnessScore: number;
};

export type FlagCandidate = {
  symbol: string;
  whatIsUnusual: string;
  openInterestConfirmsOpened: boolean;
  boringExplanation: string;
  whatToFindOut: string;
  confidence: "low" | "medium" | "high";
};

export type OptionsFlowResult = {
  asOf: string;
  records: OptionsFlowRecord[];
  analysis: AnalysisOutput[];
  flagging: {
    candidates: FlagCandidate[];
    nothingUnusualNote: string | null;
    researchQuestion: string | null;
  };
  disclaimer: string;
};

export const CONFIDENCE_STYLE: Record<FlagCandidate["confidence"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-600/15 text-blue-700",
  high: "bg-rose-500/15 text-rose-700",
};
