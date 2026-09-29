/** UI labels for research_reports.source keys. */
export const RESEARCH_SOURCE_LABELS: Record<string, string> = {
  ventura_research: "Ventura Securities",
  axis_direct_research: "Axis Direct Research",
  trendlyne_research: "Trendlyne Institutional",
  et_recos: "Economic Times",
  livemint_recos: "LiveMint",
  chittorgarh_ipo_reviews: "Chittorgarh IPO consensus",
  apify_ingest: "Apify feed",
  zapier_ingest: "Zapier ingest",
};

export const RESEARCH_SOURCE_ORDER = [
  "ventura_research",
  "axis_direct_research",
  "trendlyne_research",
  "chittorgarh_ipo_reviews",
  "et_recos",
  "livemint_recos",
  "apify_ingest",
  "zapier_ingest",
] as const;
