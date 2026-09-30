export type FeedSourceId =
  | "nse"
  | "bse"
  | "rbi"
  | "sec"
  | "yahoo"
  | "stooq"
  | "alphavantage"
  | "fred"
  | "worldbank"
  | "data360"
  | "imf"
  | "oecd"
  | "mospi"
  | "biquote"
  | "upstox"
  | "massive"
  | "reddit"
  | "livemint"
  | "moneycontrol"
  | "googlenews"
  | "busstd"
  | "rsswire";

export type FeedHealth = {
  id: FeedSourceId;
  label: string;
  ok: boolean;
  latencyMs: number;
  message?: string;
  updatedAt: string;
};

export type NewsItem = {
  id: string;
  source: FeedSourceId;
  title: string;
  link: string;
  publishedAt?: string;
};

export type LiveQuote = {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePct: number;
  currency?: string;
  asOf: string;
  provider: "yahoo" | "stooq" | "alphavantage" | "biquote" | "truedata" | "upstox" | "massive";
  /** True when served from persisted last-good data because every live source
   *  failed — the quote is real but delayed; `asOf` says when it was captured. */
  stale?: boolean;
};

export type MacroPoint = {
  date: string;
  value: number;
};

export type LiveMacroSeries = {
  id: string;
  name: string;
  unit: string;
  source: FeedSourceId;
  latest: number;
  change: number;
  points: MacroPoint[];
};

export type FeedHubPayload = {
  fetchedAt: string;
  health: FeedHealth[];
  news: NewsItem[];
  quotes: LiveQuote[];
  macro: LiveMacroSeries[];
  indices: LiveQuote[];
};
