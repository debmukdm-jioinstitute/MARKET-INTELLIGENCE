import type { Holding, PortfolioAnalysis, PortfolioSettings, PositionRow } from "@/lib/my-portfolio/types";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/my-portfolio/defaults";
import { emptyPortfolioAnalysis } from "@/lib/my-portfolio/metrics-empty";

const CACHE_KEY = "mi_portfolio_analysis_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const USD_INR_EST = 87;

type Cached = { savedAt: number; analysis: PortfolioAnalysis };

export function readCachedPortfolioAnalysis(): PortfolioAnalysis | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.analysis?.fetchedAt) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.analysis;
  } catch {
    return null;
  }
}

export function writeCachedPortfolioAnalysis(analysis: PortfolioAnalysis): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Cached = { savedAt: Date.now(), analysis };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

/** Instant book from local holdings (avg-cost marks) while live analysis runs. */
export function provisionalPortfolioAnalysis(
  holdings: Holding[],
  settings: PortfolioSettings = DEFAULT_PORTFOLIO_SETTINGS,
): PortfolioAnalysis {
  const base = emptyPortfolioAnalysis(settings);
  if (!holdings.length) return base;

  const cashInr = settings.cashInr ?? 0;
  const positionsRaw: PositionRow[] = holdings.map((h) => {
    const last = h.avgCost;
    const lastInr = h.currency === "INR" ? last : last * USD_INR_EST;
    const marketValueInr = h.shares * lastInr;
    const costInr = h.currency === "INR" ? h.avgCost : h.avgCost * USD_INR_EST;
    return {
      id: h.id,
      market: h.market,
      symbol: h.symbol,
      name: h.name,
      sector: h.sector,
      currency: h.currency,
      shares: h.shares,
      avgCost: h.avgCost,
      last,
      lastInr,
      dayPct: 0,
      marketValueInr,
      weight: 0,
      pnlInr: h.shares * (lastInr - costInr),
      pnlPct: h.avgCost > 0 ? last / h.avgCost - 1 : 0,
    };
  });
  const navInr = positionsRaw.reduce((s, p) => s + p.marketValueInr, 0) + cashInr;
  const positions = positionsRaw.map((p) => ({
    ...p,
    weight: navInr > 0 ? p.marketValueInr / navInr : 0,
  }));

  return {
    ...base,
    fetchedAt: new Date().toISOString(),
    settings,
    hasHoldings: true,
    navInr,
    cashInr,
    todayPnlInr: 0,
    positions,
    overview: base.overview.map((m) =>
      m.id === "nav"
        ? { ...m, value: navInr, formatted: `₹${navInr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, status: "approx" as const, note: "Updating live exchange prices…" }
        : m,
    ),
  };
}
