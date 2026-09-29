export type SearchTrendCategory =
  | "company"
  | "ipo"
  | "sector"
  | "commodity"
  | "economic_indicator"
  | "policy"
  | "ceo"
  | "product";

export type SearchTrendWatchItem = {
  id: string;
  category: SearchTrendCategory;
  label: string;
  /** Query sent to Google Trends */
  keyword: string;
  symbol?: string;
  href?: string;
};

export type TrendPoint = { date: string; value: number };

export type SearchTrendSeries = {
  item: SearchTrendWatchItem;
  timeline: TrendPoint[];
  currentInterest: number;
  priorAvg: number;
  momentumPct: number;
  attentionIndex: number;
  trendLabel: "surging" | "rising" | "stable" | "cooling" | "fading";
  source: {
    provider: "Google Trends";
    url: string;
    mode: "live" | "fallback";
    asOf: string;
  };
};

export type SearchTrendHubPayload = {
  title: string;
  summary: string;
  geo: string;
  window: string;
  generatedAt: string;
  methodology: string;
  liveCount: number;
  fallbackCount: number;
  categoryAverages: { category: SearchTrendCategory; label: string; attentionIndex: number; count: number }[];
  topAttention: SearchTrendSeries[];
  topMomentum: SearchTrendSeries[];
  series: SearchTrendSeries[];
};

export const SEARCH_TREND_CATEGORY_LABELS: Record<SearchTrendCategory, string> = {
  company: "Company",
  ipo: "IPO",
  sector: "Sector",
  commodity: "Commodity",
  economic_indicator: "Economic indicator",
  policy: "Policy",
  ceo: "CEO / leader",
  product: "Product",
};
