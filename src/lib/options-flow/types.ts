import type { FieldSource } from "@/lib/feeds/india/types";

/**
 * Per doc: "If a data point is unavailable, write UNAVAILABLE rather than
 * estimating or carrying forward yesterday's number. Never fill a gap."
 * Every gathered figure is either present with its source+timestamp, or
 * explicitly unavailable with a reason — there is no third state.
 */
export type SourcedField<T> =
  | { status: "ok"; value: T; source: FieldSource }
  | { status: "unavailable"; reason: string };

export type ActiveStrikeOiChange = {
  strike: number;
  side: "call" | "put";
  volume: number;
  oi: number;
  prevOi: number;
  change: number;
};

/** Output of the Data Agent for one ticker on one day. Gathers only — never analyzed here. */
export type OptionsFlowRecord = {
  date: string;
  symbol: string;
  name: string;
  instrumentKey: string;
  price: SourcedField<number>;
  priceChangePct: SourcedField<number>;
  volume: SourcedField<number>;
  volumeAvg30: SourcedField<number>;
  callsVolume: SourcedField<number>;
  putsVolume: SourcedField<number>;
  /** Most-active strikes by volume, with the OI change at each — not just the volume. */
  activeStrikeOiChanges: SourcedField<ActiveStrikeOiChange[]>;
  upcomingEvent: SourcedField<string>;
};

/** Deterministic stats computed in code before the Analysis Agent ever sees the ticker — the LLM narrates these numbers, it never computes or invents them. */
export type TickerBaseline = {
  symbol: string;
  name: string;
  historyDays: number;
  volumeRatio: number | null;
  optionsVolumeToday: number | null;
  optionsVolumeAvg30: number | null;
  optionsVolumeZ: number | null;
  callPutRatioToday: number | null;
  callPutRatioAvg30: number | null;
  oiOpenedStrikes: ActiveStrikeOiChange[];
  oiClosedStrikes: ActiveStrikeOiChange[];
  priceChangePct: number | null;
  /** From Upstox's corporate-actions feed: upcoming dividend/bonus/split/rights, or null if that feed was unavailable. Earnings dates aren't covered — Upstox has no such calendar. */
  upcomingEventNote: string | null;
  /** Doc's exact flag condition: unusual options volume opened new positions and price hasn't moved correspondingly. */
  candidateFlag: boolean;
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

export type FlaggingResult = {
  candidates: FlagCandidate[];
  nothingUnusualNote: string | null;
  researchQuestion: string | null;
};

export type OptionsFlowRunResult = {
  asOf: string;
  records: OptionsFlowRecord[];
  analysis: AnalysisOutput[];
  flagging: FlaggingResult;
  disclaimer: string;
};

export const OPTIONS_FLOW_DISCLAIMER =
  "Educational research and screening tool, not a signal generator or financial advice. Raw options volume does not reveal direction, whether positions opened or closed, or whether a trade was a directional bet or a hedge — it is a reason to go look at a company, never a reason to take a position. Options are leveraged and expire; being right about direction and wrong about timing can still lose everything.";
