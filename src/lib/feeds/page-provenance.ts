import type { FieldSource } from "@/lib/feeds/india/types";
import {
  FEED_HUB_FIELD_SOURCE,
  fieldSourceFromFeedId,
  getFeedSourceProvenance,
} from "@/lib/feeds/feed-source-provenance";
import type { FeedSourceId } from "@/lib/feeds/types";

export type PageProvenanceChip =
  | { kind: "feed"; sourceId: FeedSourceId; label?: string }
  | { kind: "api"; label: string; source: FieldSource; fetchMethod: string };

export type PageProvenance = {
  summary: string;
  chips: PageProvenanceChip[];
};

const INDIA_DASH: PageProvenanceChip = {
  kind: "api",
  label: "India dashboard API",
  source: {
    provider: "India dashboard composite",
    url: "/api/feeds/india-dashboard",
  },
  fetchMethod:
    "buildIndiaDashboard() — Upstox quotes, NSE breadth, RBI liquidity, Yahoo FX — src/lib/feeds/india/build-dashboard.ts",
};

const FEED_HUB_CHIP: PageProvenanceChip = {
  kind: "api",
  label: "Feed hub",
  source: FEED_HUB_FIELD_SOURCE,
  fetchMethod: "buildFeedHub() — src/lib/feeds/hub.ts",
};

function chips(...ids: FeedSourceId[]): PageProvenanceChip[] {
  return ids.map((sourceId) => ({ kind: "feed", sourceId }));
}

/** Longest matching prefix wins. */
const RULES: { prefix: string; match: PageProvenance }[] = [
  {
    prefix: "/data/feeds",
    match: {
      summary: "Live health for every upstream feed merged by the hub.",
      chips: [FEED_HUB_CHIP, ...chips("nse", "bse", "rbi", "reddit", "livemint", "fred", "upstox")],
    },
  },
  {
    prefix: "/data/health",
    match: {
      summary: "Collector run status and macro ingestion pipelines.",
      chips: [
        {
          kind: "api",
          label: "Collector cron",
          source: { provider: "Macro collectors", url: "/api/cron/collect" },
          fetchMethod: "runCollectors() — src/lib/collector/run.ts",
        },
        ...chips("mospi", "fred", "rbi"),
      ],
    },
  },
  {
    prefix: "/data/data360",
    match: {
      summary: "World Bank Data360 mirror stored in project DB.",
      chips: chips("data360", "worldbank"),
    },
  },
  {
    prefix: "/data",
    match: {
      summary: "Data desk routing and export endpoints.",
      chips: [FEED_HUB_CHIP, ...chips("fred", "worldbank")],
    },
  },
  {
    prefix: "/intelligence/legal-risk",
    match: {
      summary: "Legal/insolvency headline classifier over feed hub — NCLT, courts, SEBI, CCI, ED, RBI chains.",
      chips: [
        {
          kind: "api",
          label: "Legal risk hub",
          source: { provider: "MI legal risk", url: "/api/feeds/legal-risk" },
          fetchMethod: "buildLegalRiskHub() — src/lib/legal-risk/build-hub.ts",
        },
        ...chips("nse", "bse", "rbi", "livemint", "moneycontrol"),
      ],
    },
  },
  {
    prefix: "/intelligence/reddit",
    match: {
      summary: "Retail sentiment engine & alternative data — Reddit discussion NLP across r/IndiaInvestments, r/IndianStreetBets, r/IndianStockMarket, and investor problems radar.",
      chips: [
        {
          kind: "api",
          label: "Reddit retail sentiment",
          source: { provider: "MI social NLP engine", url: "/api/reddit/sentiment" },
          fetchMethod: "fetchLiveCompanySentiment() — OAuth/public JSON + RSS fallback — src/lib/reddit-sentiment/",
        },
        ...chips("nse", "bse"),
      ],
    },
  },
  {
    prefix: "/intelligence/company",
    match: {
      summary: "Company-specific intelligence — currently unavailable: no verified IR disclosure or concall transcript feed is connected.",
      chips: [
        {
          kind: "api",
          label: "Company intelligence desk",
          source: { provider: "Feed not connected", url: "/api/company/intelligence" },
          fetchMethod: "dataStatus: UNAVAILABLE — no verified feed",
        },
        ...chips("nse", "bse"),
      ],
    },
  },
  {
    prefix: "/intelligence/credit",
    match: {
      summary: "Credit & risk intelligence — currently unavailable: no verified rating-agency feed is connected.",
      chips: [
        {
          kind: "api",
          label: "Credit intelligence desk",
          source: { provider: "Feed not connected", url: "/api/credit" },
          fetchMethod: "dataStatus: UNAVAILABLE — no verified feed",
        },
        ...chips("nse", "bse"),
      ],
    },
  },
  {
    prefix: "/intelligence/promoters",
    match: {
      summary: "Promoter activity tracker — currently unavailable: no verified SEBI PIT/SAST disclosure feed is connected.",
      chips: [
        {
          kind: "api",
          label: "Promoter activity tracker",
          source: { provider: "Feed not connected", url: "/api/promoters" },
          fetchMethod: "dataStatus: UNAVAILABLE — no verified feed",
        },
        ...chips("nse", "bse"),
      ],
    },
  },
  {
    prefix: "/intelligence/institutional",
    match: {
      summary: "NSE FII/DII cash flows, smart-money score, and exchange filing links. Mutual-fund accumulation is unavailable until AMC disclosures are ingested.",
      chips: [
        {
          kind: "api",
          label: "Institutional hub",
          source: { provider: "MI institutional intelligence", url: "/api/feeds/institutional" },
          fetchMethod: "buildInstitutionalIntelligence() — src/lib/institutional/build-hub.ts",
        },
        ...chips("nse"),
      ],
    },
  },
  {
    prefix: "/intelligence/search-trends",
    match: {
      summary: "Google Trends search interest (India) → Attention Index by topic category.",
      chips: [
        {
          kind: "api",
          label: "Search-trend hub",
          source: { provider: "Google Trends", url: "https://trends.google.com" },
          fetchMethod: "buildSearchTrendHub() — src/lib/search-trends/build-hub.ts · /api/feeds/search-trends",
        },
      ],
    },
  },
  {
    prefix: "/intelligence/world-monitor",
    match: {
      summary: "Free global RSS, Yahoo indices, FRED CSV, MI what-changed cache.",
      chips: [
        {
          kind: "api",
          label: "World monitor bundle",
          source: { provider: "World Monitor (free feeds)", url: "/api/worldmonitor/global-feeds" },
          fetchMethod: "buildFreeGlobalFeeds() — src/lib/worldmonitor/free-global-feeds.ts",
        },
        ...chips("yahoo", "fred"),
      ],
    },
  },
  {
    prefix: "/intelligence/scanner",
    match: {
      summary: "Scan alerts and options flow from exchange-licensed and public APIs.",
      chips: [
        {
          kind: "api",
          label: "Scanner API",
          source: { provider: "MI scanner", url: "/api/scanner" },
          fetchMethod: "Scheduled scan cron — src/app/api/cron/scan",
        },
        ...chips("upstox", "nse"),
      ],
    },
  },
  {
    prefix: "/intelligence",
    match: {
      summary: "Exchange RSS plus Reddit, publisher RSS, and Google News in feed hub.",
      chips: [
        FEED_HUB_CHIP,
        ...chips("nse", "bse", "rbi", "reddit", "livemint", "moneycontrol", "googlenews"),
      ],
    },
  },
  {
    prefix: "/research-reports",
    match: {
      summary: "Broker research scraped and aggregated from public portals.",
      chips: [
        {
          kind: "api",
          label: "Research reports API",
          source: { provider: "Research desk", url: "/api/research-reports" },
          fetchMethod: "Research scrapers — src/lib/research/ · cron /api/cron/scrape-research",
        },
        ...chips("nse", "googlenews"),
      ],
    },
  },
  {
    prefix: "/research/offers",
    match: {
      summary: "Buyback, OFS, and NCD offer data from Chittorgarh and exchange filings.",
      chips: [
        {
          kind: "api",
          label: "Offers report",
          source: { provider: "Offers desk", url: "/api/feeds/offers" },
          fetchMethod: "Chittorgarh + NSE — src/lib/feeds/sources/chittorgarh-report-api.ts",
        },
      ],
    },
  },
  {
    prefix: "/research/ipo",
    match: {
      summary: "Upstox IPO calendar, GMP enrich, DRHP/RHP text extract, intelligence dossier, analyst memo.",
      chips: [
        {
          kind: "api",
          label: "IPO feed",
          source: { provider: "IPO desk", url: "/api/feeds/ipo" },
          fetchMethod: "Upstox + GMP — src/lib/feeds/ipo/",
        },
        {
          kind: "api",
          label: "IPO intelligence",
          source: { provider: "IPO intelligence", url: "/api/feeds/ipo/{id}/intelligence" },
          fetchMethod: "buildIpoIntelligence() — src/lib/feeds/ipo/build-intelligence.ts",
        },
      ],
    },
  },
  {
    prefix: "/research/options-flow",
    match: {
      summary: "Options flow and chain from Upstox market data.",
      chips: chips("upstox"),
    },
  },
  {
    prefix: "/research/",
    match: {
      summary: "Symbol research pack: quote, fundamentals, news, SEC/NSE filings.",
      chips: [
        {
          kind: "api",
          label: "Research pack",
          source: { provider: "Symbol research", url: "/api/feeds/research/{symbol}" },
          fetchMethod: "buildResearchDetail() — src/lib/feeds/research-detail.ts",
        },
        ...chips("nse", "sec", "googlenews", "upstox"),
      ],
    },
  },
  {
    prefix: "/research",
    match: {
      summary: "Broker research notes aggregator: real collected notes from public desk publications, plus Nifty 500 earnings calendar.",
      chips: [
        {
          kind: "api",
          label: "Earnings calendar",
          source: { provider: "Yahoo Finance", url: "/api/feeds/earnings-calendar" },
          fetchMethod: "buildEarningsCalendarPanel() — src/lib/feeds/earnings/build-calendar.ts",
        },
        {
          kind: "api",
          label: "Research notes API",
          source: { provider: "Ingested research_reports table", url: "/api/broker-research" },
          fetchMethod: "Direct SQL on research_reports — src/app/api/broker-research/route.ts (real collected notes only; no estimates)",
        },
        ...chips("nse", "upstox", "googlenews"),
      ],
    },
  },
  {
    prefix: "/markets/india/",
    match: {
      summary: "Security detail: Upstox quote, Yahoo history, NSE corporate actions.",
      chips: [INDIA_DASH, ...chips("upstox", "yahoo", "nse")],
    },
  },
  {
    prefix: "/markets/derivatives",
    match: {
      summary: "F&O chain, PCR, and expiries from Upstox.",
      chips: [INDIA_DASH, ...chips("upstox", "nse")],
    },
  },
  {
    prefix: "/markets/breadth",
    match: { summary: "Market breadth from Upstox live tape.", chips: [INDIA_DASH, ...chips("upstox", "nse")] },
  },
  {
    prefix: "/markets/sectors",
    match: { summary: "Sector rotation from India dashboard sector map.", chips: [INDIA_DASH, ...chips("upstox", "yahoo")] },
  },
  {
    prefix: "/markets/india",
    match: { summary: "India equity list and live quotes.", chips: [INDIA_DASH, ...chips("upstox", "biquote")] },
  },
  {
    prefix: "/markets",
    match: { summary: "Markets overview — indices and movers.", chips: [INDIA_DASH, ...chips("yahoo", "upstox")] },
  },
  {
    prefix: "/macro/rbi",
    match: { summary: "RBI liquidity and policy series.", chips: [INDIA_DASH, ...chips("rbi", "fred")] },
  },
  {
    prefix: "/macro/global",
    match: { summary: "Global macro hub and world indices.", chips: [...chips("fred", "imf", "oecd", "worldbank"), INDIA_DASH] },
  },
  {
    prefix: "/macro/indices",
    match: { summary: "Index levels and history.", chips: [...chips("yahoo", "biquote"), INDIA_DASH] },
  },
  {
    prefix: "/macro/commodities",
    match: { summary: "Commodity futures via Yahoo symbols.", chips: chips("yahoo", "fred") },
  },
  {
    prefix: "/macro/currency",
    match: { summary: "FX crosses via Yahoo Finance.", chips: chips("yahoo", "fred") },
  },
  {
    prefix: "/macro/india",
    match: { summary: "India macro hub sections from collectors + FRED.", chips: [...chips("mospi", "fred", "rbi"), INDIA_DASH] },
  },
  {
    prefix: "/macro/",
    match: {
      summary: "Macro section metrics from DB collectors and official APIs.",
      chips: [
        {
          kind: "api",
          label: "Macro section API",
          source: { provider: "Macro hub", url: "/api/macro/section" },
          fetchMethod: "buildIndiaMacroHub + collectors — src/lib/macro/",
        },
        ...chips("mospi", "fred", "rbi", "worldbank"),
      ],
    },
  },
  {
    prefix: "/macro",
    match: { summary: "Macro landing — policy, growth, external.", chips: chips("fred", "mospi", "rbi", "imf") },
  },
  {
    prefix: "/portfolio",
    match: {
      summary: "Portfolio analytics use your holdings plus Yahoo/Upstox history for risk.",
      chips: [
        {
          kind: "api",
          label: "Portfolio (browser)",
          source: { provider: "Your holdings", url: "/portfolio" },
          fetchMethod: "Local settings + /api/feeds/yahoo/history for marks",
        },
        ...chips("yahoo", "upstox"),
      ],
    },
  },
  {
    prefix: "/Home",
    match: {
      summary: "Home cockpit — India dashboard, feed hub news, macro cards.",
      chips: [INDIA_DASH, FEED_HUB_CHIP, ...chips("nse", "rbi", "upstox", "fred")],
    },
  },
];

const DEFAULT: PageProvenance = {
  summary: "This page may use cached or user-specific data. Click each source for fetch path.",
  chips: [FEED_HUB_CHIP],
};

const SKIP_PREFIXES = ["/profile", "/help"];

function pathMatchesRule(path: string, prefix: string): boolean {
  if (path === prefix) return true;
  if (prefix.endsWith("/")) return path.startsWith(prefix);
  return path.startsWith(`${prefix}/`);
}

export function resolvePageProvenance(pathname: string): PageProvenance | null {
  const path = pathname.split("?")[0] ?? pathname;
  if (SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  if (path === "/" || path === "") {
    return RULES.find((r) => r.prefix === "/Home")!.match;
  }
  const sorted = [...RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const rule of sorted) {
    if (pathMatchesRule(path, rule.prefix)) {
      return rule.match;
    }
  }
  return DEFAULT;
}

export function chipToFieldSource(chip: PageProvenanceChip, asOf?: string): FieldSource {
  if (chip.kind === "feed") {
    return fieldSourceFromFeedId(chip.sourceId, asOf);
  }
  return { ...chip.source, asOf, fetchMethod: chip.fetchMethod };
}

export function chipLabel(chip: PageProvenanceChip): string {
  if (chip.kind === "feed") {
    return chip.label ?? getFeedSourceProvenance(chip.sourceId).provider;
  }
  return chip.label;
}
