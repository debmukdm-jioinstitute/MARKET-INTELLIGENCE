import type { FieldSource } from "@/lib/feeds/india/types";
import type { FeedSourceId } from "@/lib/feeds/types";

export type FeedSourceProvenance = {
  provider: string;
  url: string;
  /** How the app ingests this source (endpoint, RSS URL, API path). */
  fetchMethod: string;
};

const PROVENANCE: Record<FeedSourceId, FeedSourceProvenance> = {
  nse: {
    provider: "NSE India",
    url: "https://www.nseindia.com/",
    fetchMethod: "Public RSS / JSON via NSE session — `src/lib/feeds/sources/nse.ts`",
  },
  bse: {
    provider: "BSE India",
    url: "https://www.bseindia.com/",
    fetchMethod: "BSE corporate RSS — `src/lib/feeds/sources/bse.ts`",
  },
  rbi: {
    provider: "Reserve Bank of India",
    url: "https://www.rbi.org.in/",
    fetchMethod:
      "RBI press release & notification RSS (pressreleases_rss.xml, notifications_rss.xml) — `src/lib/feeds/sources/rbi.ts`",
  },
  sec: {
    provider: "US SEC EDGAR",
    url: "https://www.sec.gov/edgar",
    fetchMethod: "SEC submissions JSON — `src/lib/feeds/sources/sec.ts`",
  },
  yahoo: {
    provider: "Yahoo Finance",
    url: "https://finance.yahoo.com/",
    fetchMethod: "Quote / history API — `src/lib/feeds/sources/yahoo.ts`",
  },
  stooq: {
    provider: "Stooq",
    url: "https://stooq.com/",
    fetchMethod: "CSV quote fallback — `src/lib/feeds/sources/stooq.ts`",
  },
  alphavantage: {
    provider: "Alpha Vantage",
    url: "https://www.alphavantage.co/",
    fetchMethod: "Global quote API (requires ALPHA_VANTAGE_API_KEY) — `src/lib/feeds/sources/alphavantage.ts`",
  },
  fred: {
    provider: "FRED (Federal Reserve Bank of St. Louis)",
    url: "https://fred.stlouisfed.org/",
    fetchMethod: "FRED series API (FRED_API_KEY) — `src/lib/feeds/sources/fred.ts`",
  },
  worldbank: {
    provider: "World Bank Open Data",
    url: "https://data.worldbank.org/",
    fetchMethod: "World Bank API — `src/lib/feeds/sources/worldbank.ts`",
  },
  data360: {
    provider: "World Bank Data360 mirror",
    url: "https://data360.worldbank.org/",
    fetchMethod: "Stored mirror health — `src/lib/data360/read-macro.ts`",
  },
  imf: {
    provider: "International Monetary Fund",
    url: "https://www.imf.org/",
    fetchMethod: "IMF Data API — `src/lib/feeds/sources/imf.ts`",
  },
  oecd: {
    provider: "OECD",
    url: "https://data.oecd.org/",
    fetchMethod: "OECD SDMX/API — `src/lib/feeds/sources/oecd.ts`",
  },
  mospi: {
    provider: "MOSPI / data.gov.in",
    url: "https://www.mospi.gov.in/",
    fetchMethod: "India open data API — `src/lib/feeds/sources/mospi.ts`",
  },
  biquote: {
    provider: "India index quotes (Upstox / Yahoo / TrueData)",
    url: "https://www.nseindia.com/",
    fetchMethod: "Multi-provider index tape — `src/lib/feeds/sources/biquote.ts`",
  },
  upstox: {
    provider: "Upstox Market Data",
    url: "https://upstox.com/",
    fetchMethod: "Upstox REST (UPSTOX_ACCESS_TOKEN) — `src/lib/feeds/sources/upstox`",
  },
  massive: {
    provider: "Massive.com",
    url: "https://massive.com/",
    fetchMethod: "US snapshot API (MASSIVE_API_KEY) — `src/lib/feeds/sources/massive.ts`",
  },
  reddit: {
    provider: "Reddit",
    url: "https://www.reddit.com/",
    fetchMethod:
      "Subreddit JSON listings (FEED_REDDIT_SUBS) — `src/lib/feeds/sources/reddit.ts` · requires FEED_USER_AGENT",
  },
  livemint: {
    provider: "LiveMint",
    url: "https://www.livemint.com/rss/markets",
    fetchMethod: "Markets RSS — `src/lib/feeds/sources/open-news-rss.ts`",
  },
  moneycontrol: {
    provider: "Moneycontrol",
    url: "https://www.moneycontrol.com/rss/latestnews.xml",
    fetchMethod: "Latest news RSS — `src/lib/feeds/sources/open-news-rss.ts`",
  },
  googlenews: {
    provider: "Google News (RSS search)",
    url: "https://news.google.com/",
    fetchMethod:
      "India macro search queries (FEED_GOOGLE_NEWS_QUERIES) — `src/lib/feeds/sources/google-news-india.ts`",
  },
  busstd: {
    provider: "Business Standard",
    url: "https://www.business-standard.com/rss/markets-106.rss",
    fetchMethod: "Markets RSS — `src/lib/feeds/sources/open-news-rss.ts`",
  },
  rsswire: {
    provider: "Custom RSS",
    url: "https://getmarketintelligence.in/data/feeds",
    fetchMethod: "Extra feeds from FEED_RSS_URLS — `src/lib/feeds/open-news-config.ts`",
  },
};

export function getFeedSourceProvenance(id: FeedSourceId): FeedSourceProvenance {
  return PROVENANCE[id];
}

export function fieldSourceFromFeedId(id: FeedSourceId, asOf?: string): FieldSource {
  const p = getFeedSourceProvenance(id);
  return { provider: p.provider, url: p.url, asOf, fetchMethod: p.fetchMethod };
}

export const FEED_HUB_FIELD_SOURCE: FieldSource = {
  provider: "Market Intelligence feed hub",
  url: "/api/feeds/hub",
};

export function provenanceNote(id: FeedSourceId, healthMessage?: string): string {
  const p = getFeedSourceProvenance(id);
  const parts = [`Ingestion: ${p.fetchMethod}`];
  if (healthMessage && healthMessage !== "ok") parts.push(`Status: ${healthMessage}`);
  return parts.join(" · ");
}
