import { computeAttentionMetrics } from "@/lib/search-trends/attention-index";
import { ensureGoogleTrendsSession } from "@/lib/search-trends/google-trends-session";
import { fetchGoogleTrendTimeline, trendsExploreUrl, trendsGeoLabel } from "@/lib/search-trends/google-trends";
import type { SearchTrendCategory, SearchTrendHubPayload, SearchTrendSeries, SearchTrendWatchItem } from "@/lib/search-trends/types";
import { SEARCH_TREND_CATEGORY_LABELS } from "@/lib/search-trends/types";
import { SEARCH_TREND_WATCHLIST } from "@/lib/search-trends/watchlist";

const WINDOW_LABEL = process.env.GOOGLE_TRENDS_WINDOW ?? "today 3-m";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  gapMs: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]!);
      if (gapMs > 0 && i < items.length - 1) await sleep(gapMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

async function buildSeries(item: SearchTrendWatchItem): Promise<SearchTrendSeries> {
  const { timeline, mode } = await fetchGoogleTrendTimeline(item.keyword);
  const metrics = computeAttentionMetrics(timeline);
  const asOf = new Date().toISOString();
  return {
    item,
    timeline,
    ...metrics,
    source: {
      provider: "Google Trends",
      url: trendsExploreUrl(item.keyword),
      mode,
      asOf,
    },
  };
}

export type BuildSearchTrendHubOptions = {
  category?: SearchTrendCategory;
  keyword?: string;
  limit?: number;
};

export async function buildSearchTrendHub(opts: BuildSearchTrendHubOptions = {}): Promise<SearchTrendHubPayload> {
  let items = [...SEARCH_TREND_WATCHLIST];
  if (opts.category) items = items.filter((i) => i.category === opts.category);
  if (opts.keyword?.trim()) {
    const q = opts.keyword.trim();
    items = [
      {
        id: `custom-${hashId(q)}`,
        category: opts.category ?? "company",
        label: q,
        keyword: q,
      },
      ...items.filter((i) => i.keyword.toLowerCase().includes(q.toLowerCase()) || i.label.toLowerCase().includes(q.toLowerCase())),
    ];
    const seen = new Set<string>();
    items = items.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
  }
  const limit = opts.limit ?? items.length;
  items = items.slice(0, Math.min(limit, 32));

  await ensureGoogleTrendsSession();
  const series = await mapWithConcurrency(items, 2, 350, buildSeries);
  const liveCount = series.filter((s) => s.source.mode === "live").length;
  const fallbackCount = series.length - liveCount;

  const categoryAverages = (Object.keys(SEARCH_TREND_CATEGORY_LABELS) as SearchTrendCategory[]).map((category) => {
    const rows = series.filter((s) => s.item.category === category);
    const attentionIndex =
      rows.length > 0 ? Math.round(rows.reduce((a, s) => a + s.attentionIndex, 0) / rows.length) : 0;
    return { category, label: SEARCH_TREND_CATEGORY_LABELS[category], attentionIndex, count: rows.length };
  });

  const topAttention = [...series].sort((a, b) => b.attentionIndex - a.attentionIndex).slice(0, 8);
  const topMomentum = [...series].sort((a, b) => b.momentumPct - a.momentumPct).slice(0, 8);

  const geo = trendsGeoLabel();
  const summary =
    liveCount > 0
      ? `${liveCount} live Google Trends series (${geo}, ${WINDOW_LABEL}); ${fallbackCount} used fallback when Trends blocked.`
      : `Google Trends unreachable from server — Attention Index uses deterministic fallback curves until live fetch works (${geo}).`;

  return {
    title: "Search-trend intelligence",
    summary,
    geo,
    window: WINDOW_LABEL,
    generatedAt: new Date().toISOString(),
    methodology:
      "Attention Index blends latest Google search interest (0–100) with 4-week momentum. Categories: company, IPO, sector, commodity, economic indicator, policy, CEO, product.",
    liveCount,
    fallbackCount,
    categoryAverages,
    topAttention,
    topMomentum,
    series,
  };
}

function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function compactSearchTrendsForMcp(payload: SearchTrendHubPayload) {
  return {
    geo: payload.geo,
    window: payload.window,
    liveCount: payload.liveCount,
    fallbackCount: payload.fallbackCount,
    categoryAverages: payload.categoryAverages.filter((c) => c.count > 0).slice(0, 8),
    topAttention: payload.topAttention.slice(0, 10).map((s) => ({
      label: s.item.label,
      category: s.item.category,
      keyword: s.item.keyword,
      attentionIndex: s.attentionIndex,
      momentumPct: Math.round(s.momentumPct * 10) / 10,
      trend: s.trendLabel,
      mode: s.source.mode,
    })),
    topMomentum: payload.topMomentum.slice(0, 6).map((s) => ({
      label: s.item.label,
      momentumPct: Math.round(s.momentumPct * 10) / 10,
      attentionIndex: s.attentionIndex,
    })),
  };
}
