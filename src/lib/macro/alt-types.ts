/** Response shapes of the /api/macro/* alt-data routes (rates, World Bank, UPI, GST, auto sales, power, monsoon). */

export type SourceRef = { name: string; url: string };
export type AltEnvelope = { available: boolean; source: SourceRef; error: string | null };

export type RefRate = { code: string; date: string; value: number; prev: number | null; unit: string; url: string; series: { date: string; value: number }[] };
export type CurveRow = { tenor: string; rank: number; date: string; value: number; prev: number | null; url: string };

export type FbilPayload = AltEnvelope & {
  asOf: string | null;
  usdInr: RefRate | null;
  otherRefs: RefRate[];
  overnight: { mibor: RefRate | null; mror: RefRate | null; sorr: RefRate | null };
  mibor: { ois: CurveRow[]; term: CurveRow[] };
  tbill: CurveRow[];
  certificateOfDeposit: CurveRow[];
  forwardPremia: CurveRow[];
  gsec: { parYieldCurve: CurveRow[]; tenYear: { date: string; value: number; url: string; series: { date: string; value: number }[] } | null };
};

export type WorldBankIndicator = {
  code: string;
  label: string;
  unit: string;
  url: string;
  latest: { year: number; value: number } | null;
  previous: { year: number; value: number } | null;
  series: { year: number; value: number }[];
};
export type WorldBankPayload = AltEnvelope & { indicators: WorldBankIndicator[] };

export type MonthlyPoint = { month: string; value: number; yoyPct: number | null };
export type UpiPayload = AltEnvelope & {
  latestMonth: string | null;
  volumeMn: { latest: number | null; yoyPct: number | null; series: MonthlyPoint[] };
  valueCr: { latest: number | null; yoyPct: number | null; series: MonthlyPoint[] };
};
export type GstPayload = AltEnvelope & { latestMonth: string | null; latest: number | null; yoyPct: number | null; series: MonthlyPoint[] };

export type AutoSegment = {
  key: string;
  label: string;
  month: string | null;
  units: number | null;
  yoyPct: number | null;
  url: string;
  series: { month: string; units: number; yoyPct: number | null }[];
};
export type AutoPayload = AltEnvelope & { note: string; segments: AutoSegment[] };

export type PowerPayload = AltEnvelope & {
  latest: { day: string; demandMw: number; demandGw: number; yoyPct: number | null; energyMu: number | null; energyYoyPct: number | null } | null;
  series: { day: string; demandMw: number }[];
};

export type MonsoonWindow = { start: string; end: string; actualMm: number | null; normalMm: number | null; pctOfNormal: number | null; yearsInNormal: number };
export type MonsoonPayload = AltEnvelope & {
  mode: "season" | "last90" | "none";
  today: string;
  window: MonsoonWindow | null;
  season: MonsoonWindow | null;
  seasonYear: number;
  verdict: "ahead" | "behind" | "about-normal" | null;
  daily: { date: string; value: number }[];
  cumulative: { date: string; actual: number; normal: number | null }[];
  locations: number;
};
