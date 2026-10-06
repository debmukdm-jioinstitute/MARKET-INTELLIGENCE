import type { FeedSourceId } from "@/lib/feeds/types";

export type OpenRssFeed = {
  url: string;
  source: FeedSourceId;
  label: string;
  limit: number;
};

/** Default India-focused open RSS (no API keys). Override via env where noted. */
export const DEFAULT_OPEN_RSS: OpenRssFeed[] = [
  {
    url: "https://www.livemint.com/rss/markets",
    source: "livemint",
    label: "LiveMint markets",
    limit: 14,
  },
  {
    url: "https://www.moneycontrol.com/rss/latestnews.xml",
    source: "moneycontrol",
    label: "Moneycontrol",
    limit: 14,
  },
  {
    url: "https://www.business-standard.com/rss/markets-106.rss",
    source: "busstd",
    label: "Business Standard markets",
    limit: 12,
  },
];

export const DEFAULT_REDDIT_SUBREDDITS = [
  "IndiaInvestments",
  "IndianStreetBets",
  "Economics",
  "stocks",
] as const;

export const DEFAULT_GOOGLE_NEWS_QUERIES: { query: string; tag: string }[] = [
  { query: "NSE BSE India stock market", tag: "India markets" },
  { query: "Nifty Sensex stock market today", tag: "Market moves" },
  { query: "India quarterly earnings results", tag: "Earnings" },
  { query: "SEBI fraud scam stock manipulation India", tag: "Regulation & fraud" },
  { query: "geopolitics oil markets impact India stocks", tag: "Global & geopolitics" },
  { query: "RBI monetary policy India", tag: "RBI policy" },
  { query: "India FII DII flows", tag: "Institutional flows" },
];

function envFlag(name: string, defaultOn = true): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultOn;
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  return true;
}

/** Master switch for Reddit + publisher RSS + Google News macro queries in feed hub. */
export function openCommunityNewsEnabled(): boolean {
  return envFlag("FEED_OPEN_NEWS", true);
}

export function redditSubreddits(): string[] {
  const raw = process.env.FEED_REDDIT_SUBS?.trim();
  if (!raw) return [...DEFAULT_REDDIT_SUBREDDITS];
  const subs = raw
    .split(/[,;\s]+/)
    .map((s) => s.replace(/^r\//i, "").trim())
    .filter(Boolean);
  return subs.length ? subs : [...DEFAULT_REDDIT_SUBREDDITS];
}

export function openRssFeeds(): OpenRssFeed[] {
  const extra = process.env.FEED_RSS_URLS?.trim();
  if (!extra) return DEFAULT_OPEN_RSS;
  const feeds: OpenRssFeed[] = [...DEFAULT_OPEN_RSS];
  for (const part of extra.split("|")) {
    const [url, source, label] = part.split(",").map((s) => s.trim());
    if (!url?.startsWith("http")) continue;
    const src = (source as FeedSourceId) || "rsswire";
    feeds.push({
      url,
      source: src,
      label: label || url,
      limit: 10,
    });
  }
  return feeds;
}

export function googleNewsMacroQueries(): { query: string; tag: string }[] {
  const raw = process.env.FEED_GOOGLE_NEWS_QUERIES?.trim();
  if (!raw) return DEFAULT_GOOGLE_NEWS_QUERIES;
  return raw.split("|").map((chunk) => {
    const [query, tag] = chunk.split("::").map((s) => s.trim());
    return { query: query || "India markets", tag: tag || "Custom" };
  });
}
