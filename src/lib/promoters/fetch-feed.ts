import { extractMarkdownLinks, fetchAgencyPageContent } from "@/lib/credit/crawl/page-content";
import { PROMOTER_DISCLOSURE_SOURCES } from "@/lib/promoters/disclosure-sources";
import {
  inferCompanyFromTitle,
  inferPromoterCategory,
  inferSymbolFromTitle,
} from "@/lib/promoters/parse-category";
import type {
  PromoterFeedCollector,
  PromoterFeedItem,
  PromoterFeedSnapshot,
  PromoterFeedChannel,
} from "@/lib/promoters/feed-types";
import { feedFetch } from "@/lib/feeds/http";
import { normalizeNewsPublishedAt } from "@/lib/feeds/news-sort";
import { parseRss } from "@/lib/feeds/rss";
import { createHash } from "node:crypto";
import { fetchNseNative } from "@/lib/promoters/nse-native";

const RSS_LIMIT = 25;
const MAX_AGE_DAYS = 30;
const PER_CHANNEL_CAP = 60; // keeps 100+ daily bulk rows from crowding out promoter filings and news
const MAX_ITEMS = 240;

/** Titles that are site chrome / raw filing letters rather than news about a promoter event. */
const JUNK_TITLE = [
  /^untitled\b/i,
  /^(the )?(corporate service|listing) department/i,
  /^to,?\s+the (manager|general manager)/i,
  /\bexchange rate\b|\bforecast, chart\b/i,
  /^(market watch|national stock exchange of india)\b/i,
  /^(bse|nse)\b.*\b(home|india)\s*$/i,
  /^\w+ \d{1,2}, \d{4}\s+(to|the)\b/i,
];

export function isUsefulRssItem(title: string, transactionDate: string, now = Date.now()): boolean {
  if (title.trim().length < 15) return false;
  if (JUNK_TITLE.some((re) => re.test(title.trim()))) return false;
  const age = (now - Date.parse(transactionDate)) / 86_400_000;
  return Number.isFinite(age) && age <= MAX_AGE_DAYS && age >= -1;
}

function googleNewsRssUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function stableId(channel: string, title: string, date: string, url: string): string {
  return createHash("sha256").update(`${channel}|${title}|${date}|${url}`).digest("hex").slice(0, 24);
}

function toDate(iso: string | undefined): string {
  const norm = normalizeNewsPublishedAt(iso);
  return norm ? norm.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

async function fetchChannelRss(channel: PromoterFeedChannel, rssQuery: string): Promise<PromoterFeedItem[]> {
  try {
    const res = await feedFetch(googleNewsRssUrl(`${rssQuery} when:30d`), { timeoutMs: 14_000 });
    if (!res.ok) return [];
    const xml = await res.text();
    const rows = parseRss(xml, "googlenews", RSS_LIMIT);
    return rows.flatMap((row) => {
      const transactionDate = toDate(row.publishedAt);
      if (!isUsefulRssItem(row.title, transactionDate)) return [];
      return [{
        id: stableId(channel, row.title, transactionDate, row.link),
        channel,
        title: row.title,
        companyName: inferCompanyFromTitle(row.title),
        symbol: inferSymbolFromTitle(row.title),
        category: inferPromoterCategory(row.title),
        transactionDate,
        sourceUrl: row.link,
        snippet: null,
        collector: "google-news" as const,
      }];
    });
  } catch {
    return [];
  }
}

async function fetchCrawlerSupplement(
  channel: PromoterFeedChannel,
  listingUrl: string,
  host: string,
): Promise<PromoterFeedItem[]> {
  const page = await fetchAgencyPageContent(listingUrl);
  if (!page) return [];
  const links = extractMarkdownLinks(page.markdown, host).slice(0, 15);
  return links.map((url) => {
    const slug = decodeURIComponent(url.split("/").pop() ?? "disclosure").replace(/[-_]/g, " ");
    const title = slug.length > 6 ? slug : "Corporate disclosure";
    return {
      id: stableId(channel, title, "crawl", url),
      channel,
      title,
      companyName: null,
      symbol: inferSymbolFromTitle(title),
      category: inferPromoterCategory(title),
      transactionDate: new Date().toISOString().slice(0, 10),
      sourceUrl: url,
      snippet: null,
      collector: page.collector,
    };
  });
}

function dedupe(items: PromoterFeedItem[]): PromoterFeedItem[] {
  const seen = new Set<string>();
  const out: PromoterFeedItem[] = [];
  const perChannel = new Map<string, number>();
  for (const item of items.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))) {
    const key = `${item.channel}|${item.title.toLowerCase().slice(0, 140)}|${item.transactionDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const n = perChannel.get(item.channel) ?? 0;
    if (n >= PER_CHANNEL_CAP) continue;
    perChannel.set(item.channel, n + 1);
    out.push(item);
  }
  return out;
}

/** `native: false` skips the NSE API calls (user-request path — keep it light; the cron does the heavy pull). */
export type FetchPromoterFeedOptions = { deep?: boolean; native?: boolean };

export async function fetchPromoterDisclosureFeed(opts?: FetchPromoterFeedOptions): Promise<PromoterFeedSnapshot> {
  const collectorsUsed = new Set<PromoterFeedCollector>(["google-news"]);
  const [rssBatches, native] = await Promise.all([
    Promise.all(PROMOTER_DISCLOSURE_SOURCES.map((s) => fetchChannelRss(s.channel, s.rssQuery))),
    opts?.native === false ? Promise.resolve({ items: [], failed: [] as string[] }) : fetchNseNative(),
  ]);
  let items = [...native.items, ...rssBatches.flat()];
  if (native.items.length) collectorsUsed.add("nse-api");

  if (opts?.deep && (process.env.FIRECRAWL_API_KEY || process.env.CRAWL4AI_API_URL)) {
    for (const src of PROMOTER_DISCLOSURE_SOURCES.slice(0, 2)) {
      const extra = await fetchCrawlerSupplement(src.channel, src.listingUrl, src.host);
      for (const row of extra) collectorsUsed.add(row.collector);
      items = items.concat(extra);
    }
  }

  items = dedupe(items).slice(0, MAX_ITEMS);
  const asOf = new Date().toISOString();

  if (!items.length) {
    return {
      items: [],
      asOf,
      collectorsUsed: [...collectorsUsed],
      dataStatus: "UNAVAILABLE",
      message:
        "No promoter/insider disclosures loaded. Set FIRECRAWL_API_KEY or CRAWL4AI_API_URL for NSE/BSE JS pages.",
    };
  }

  return {
    items,
    asOf,
    collectorsUsed: [...collectorsUsed],
    dataStatus: "AVAILABLE",
    message: `${items.length} disclosure-related items (${native.items.length ? `NSE API ${native.items.length} + ` : ""}news RSS${opts?.deep ? " + crawler" : ""}${native.failed.length ? `; NSE sources unavailable: ${native.failed.join(", ")}` : ""}). Verify on NSE/BSE before acting.`,
  };
}
