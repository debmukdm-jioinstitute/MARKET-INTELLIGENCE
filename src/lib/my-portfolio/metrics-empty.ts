import { CATEGORY_METRICS, CATEGORY_TITLES, GLOSSARY, OVERVIEW_METRICS } from "@/lib/my-portfolio/glossary";
import type { MetricCategory, MetricResult, MetricStatus, PortfolioAnalysis, PortfolioSettings } from "@/lib/my-portfolio/types";

function m(id: string, note: string): MetricResult {
  const label = GLOSSARY[id]?.label ?? id;
  return { id, label, value: null, formatted: "N/A", status: "na" as MetricStatus, tone: "neutral", note };
}

export function emptyPortfolioAnalysis(settings: PortfolioSettings): PortfolioAnalysis {
  const categories: MetricCategory[] = Object.entries(CATEGORY_METRICS).map(([id, ids]) => ({
    id,
    title: CATEGORY_TITLES[id]!,
    metrics: ids.map((mid) => m(mid, "Add a holding to see this metric.")),
  }));
  return {
    fetchedAt: new Date().toISOString(),
    settings,
    hasHoldings: false,
    navInr: 0,
    cashInr: settings.cashInr ?? 0,
    todayPnlInr: 0,
    positions: [],
    overview: OVERVIEW_METRICS.map((id) => m(id, "Add a holding to see this metric.")),
    categories,
    navSeries: [],
    allocation: [],
    attribution: [],
    riskContribution: [],
    sectorAttribution: [],
  };
}
