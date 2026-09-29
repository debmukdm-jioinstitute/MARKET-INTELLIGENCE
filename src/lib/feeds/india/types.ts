export type FieldSource = {
  provider: string;
  url: string;
  asOf?: string;
  /** Optional ingestion path (module, RSS, API) for ⓘ popovers. */
  fetchMethod?: string;
};

export type QuoteField = {
  value: number | null;
  change?: number | null;
  changePct?: number | null;
  source: FieldSource;
};

export type IndexSnapshot = {
  symbol: string;
  name: string;
  current: QuoteField;
  high?: number | null;
  low?: number | null;
  change1d?: number | null;
  change1w?: number | null;
  change1m?: number | null;
  changeYtd?: number | null;
  history1m?: { date: string; value: number }[];
};

export type BreadthSnapshot = {
  advances: number | null;
  declines: number | null;
  unchanged: number | null;
  high52w: number | null;
  low52w: number | null;
  source: FieldSource;
};

export type FoSnapshot = {
  symbol: string;
  pcr: number | null;
  totalOi: number | null;
  changeOi: number | null;
  callOi: number | null;
  putOi: number | null;
  maxPain: number | null;
  topCallStrikes: { strike: number; oi: number }[];
  topPutStrikes: { strike: number; oi: number }[];
  source: FieldSource;
};

export type FlowRow = {
  label: string;
  today: number | null;
  d5: number | null;
  m1: number | null;
  ytd: number | null;
  source: FieldSource;
};

export type MacroRow = {
  id: string;
  indicator: string;
  current: number | null;
  previous: number | null;
  unit: string;
  direction: "up" | "down" | "flat" | "na";
  history12m: { date: string; value: number }[];
  source: FieldSource;
};

export type IndiaImpact = {
  label: "positive" | "neutral" | "negative";
  score: number;
  drivers: { factor: string; contribution: number; value: string }[];
  methodology: string;
};

export type IndiaDashboardPayload = {
  fetchedAt: string;
  pulse: {
    nifty: QuoteField;
    sensex: QuoteField;
    bankNifty: QuoteField;
    indiaVix: QuoteField;
    usdInr: QuoteField;
    gsec10y: QuoteField;
    brent: QuoteField;
    gold: QuoteField;
    breadth: BreadthSnapshot;
    indexValuation?: {
      pe: QuoteField;
      pb: QuoteField;
      divYield: QuoteField;
      indexDate: string | null;
    };
  };
  indiaMoving: {
    nifty: IndexSnapshot;
    bankNifty: IndexSnapshot;
    indiaVix: IndexSnapshot;
    breadth: BreadthSnapshot;
    fo: { nifty: FoSnapshot; bankNifty: FoSnapshot };
  };
  globalRadar: Record<string, QuoteField>;
  indiaImpact: IndiaImpact;
  indiaMacro: MacroRow[];
  rbiLiquidity: {
    rows: { label: string; value: string | null; source: FieldSource }[];
    systemLiquidity: { value: string | null; change7d: string | null; trend30d: number[]; netCr?: number | null; source: FieldSource };
    fxReserves?: { value: string | null; asOf: string | null; source: FieldSource };
    corridor?: {
      repo: string | null;
      sdf: string | null;
      msf: string | null;
      crr: string | null;
      slr: string | null;
      bankRate: string | null;
      reverseRepo: string | null;
      stance: string | null;
    };
  };
  moneyFlow: {
    fii: FlowRow;
    dii: FlowRow;
    fiiVsDii: { fii: number | null; dii: number | null; source: FieldSource };
    extras: { label: string; value: string | null; source: FieldSource }[];
  };
};
