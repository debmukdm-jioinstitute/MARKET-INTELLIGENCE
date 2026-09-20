export type Market = "IN" | "US";

export type Holding = {
  id: string;
  market: Market;
  symbol: string;
  instrumentKey: string | null;
  name: string;
  sector: string | null;
  currency: "INR" | "USD";
  shares: number;
  avgCost: number;
  addedAt: string;
};

export type PortfolioSettings = {
  name: string;
  benchmark: "NIFTY50" | "SPX" | "NDX";
  baseCurrency: "INR";
};

export type TradeLogRow = {
  symbol: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  date: string;
};

export type MetricStatus = "ok" | "approx" | "na";

export type MetricResult = {
  id: string;
  label: string;
  value: number | null;
  formatted: string;
  status: MetricStatus;
  note?: string;
  tone?: "up" | "down" | "neutral" | "warn";
};

export type MetricCategory = {
  id: string;
  title: string;
  metrics: MetricResult[];
};

export type PositionRow = {
  id: string;
  market: Market;
  symbol: string;
  name: string;
  sector: string | null;
  currency: "INR" | "USD";
  shares: number;
  avgCost: number;
  last: number;
  lastInr: number;
  dayPct: number;
  marketValueInr: number;
  weight: number;
  pnlInr: number;
  pnlPct: number;
};

export type PortfolioAnalysis = {
  fetchedAt: string;
  settings: PortfolioSettings;
  hasHoldings: boolean;
  navInr: number;
  cashInr: number;
  todayPnlInr: number;
  positions: PositionRow[];
  overview: MetricResult[];
  categories: MetricCategory[];
  navSeries: { date: string; portfolio: number; benchmark: number }[];
  allocation: { name: string; value: number }[];
  attribution: { symbol: string; name: string; contributionPct: number }[];
};
