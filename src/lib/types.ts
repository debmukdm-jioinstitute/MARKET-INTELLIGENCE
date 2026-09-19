export type AssetClass =
  | "Equity"
  | "Fixed Income"
  | "Commodity"
  | "FX"
  | "Cash"
  | "Alternative";

export type Region = "US" | "Europe" | "Japan" | "EM" | "Global";

export type Sector =
  | "Technology"
  | "Healthcare"
  | "Financials"
  | "Consumer"
  | "Industrials"
  | "Energy"
  | "Communication"
  | "Utilities"
  | "Materials"
  | "Real Estate"
  | "Rates"
  | "Credit"
  | "Precious Metals"
  | "Energy Commodity"
  | "Currency"
  | "Multi-Asset";

export type Instrument = {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector: Sector;
  region: Region;
  currency: "USD";
  betaMkt: number;
  betaRates: number;
  betaGrowth: number;
  betaValue: number;
  betaCmdty: number;
  vol: number;
  drift: number;
  startPrice: number;
  pe?: number;
  yieldPct?: number;
  description: string;
};

export type Holding = {
  symbol: string;
  shares: number;
  avgCost: number;
};

export type Trade = {
  id: string;
  date: string;
  symbol: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  notional: number;
};

export type VirtualPortfolio = {
  id: string;
  name: string;
  mandate: string;
  strategy: string;
  benchmark: string;
  inception: string;
  baseCurrency: "USD";
  cash: number;
  holdings: Holding[];
  trades: Trade[];
};

export type KpiKey =
  | "portfolioValue"
  | "todayPnl"
  | "totalReturn"
  | "cagr"
  | "alpha"
  | "beta"
  | "sharpe"
  | "sortino"
  | "maxDrawdown"
  | "volatility"
  | "trackingError"
  | "informationRatio"
  | "var95"
  | "cashPct"
  | "turnover";

export type KpiMetric = {
  key: KpiKey;
  label: string;
  value: number;
  formatted: string;
  deltaLabel?: string;
  tone: "up" | "down" | "neutral" | "warn";
  hint: string;
};

export type SeriesPoint = {
  date: string;
  value: number;
};

export type MacroSeries = {
  id: string;
  name: string;
  unit: string;
  latest: number;
  change: number;
  points: SeriesPoint[];
};
