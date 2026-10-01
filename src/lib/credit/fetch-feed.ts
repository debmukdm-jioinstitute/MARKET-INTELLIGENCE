import { CREDIT_AGENCY_SOURCES } from "@/lib/credit/agency-sources";
import { extractMarkdownLinks, fetchAgencyPageContent } from "@/lib/credit/crawl/page-content";
import { inferCompanyNameFromTitle, inferCreditActionFromTitle } from "@/lib/credit/parse-action";
import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import { normalizeNewsPublishedAt } from "@/lib/feeds/news-sort";
import type { CreditFeedCollector, CreditFeedItem, CreditFeedSnapshot, CreditRatingAgency } from "@/lib/credit/types";
import { createHash } from "node:crypto";

const RSS_LIMIT_PER_AGENCY = 12;

function googleNewsRssUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function stableId(agency: string, title: string, date: string, url: string): string {
  return createHash("sha256").update(`${agency}|${title}|${date}|${url}`).digest("hex").slice(0, 24);
}

function toActionDate(iso: string | undefined): string {
  const norm = normalizeNewsPublishedAt(iso);
  if (!norm) return new Date().toISOString().slice(0, 10);
  return norm.slice(0, 10);
}

async function fetchAgencyRssItems(
  agency: CreditRatingAgency,
  rssQuery: string,
): Promise<CreditFeedItem[]> {
  try {
    const res = await feedFetch(googleNewsRssUrl(`${rssQuery} when:30d`), { timeoutMs: 14_000 });
    if (!res.ok) return [];
    const xml = await res.text();
    const rows = parseRss(xml, "googlenews", RSS_LIMIT_PER_AGENCY);
    return rows.map((row) => {
      const action = inferCreditActionFromTitle(row.title);
      const actionDate = toActionDate(row.publishedAt);
      return {
        id: stableId(agency, row.title, actionDate, row.link),
        agency,
        title: row.title,
        companyName: inferCompanyNameFromTitle(row.title),
        symbol: null,
        action,
        actionDate,
        sourceUrl: row.link,
        snippet: null,
        collector: "google-news" as const,
      };
    });
  } catch {
    return [];
  }
}

async function fetchCrawlerSupplement(
  agency: CreditRatingAgency,
  listingUrl: string,
  host: string,
): Promise<CreditFeedItem[]> {
  const page = await fetchAgencyPageContent(listingUrl);
  if (!page) return [];

  const links = extractMarkdownLinks(page.markdown, host).slice(0, 20);
  const items: CreditFeedItem[] = [];
  for (const url of links) {
    const slug = decodeURIComponent(url.split("/").pop() ?? "release")
      .replace(/[-_]/g, " ")
      .replace(/\.(html|pdf|aspx)$/i, "");
    const title = slug.length > 8 ? slug : "Rating release";
    const action = inferCreditActionFromTitle(title);
    items.push({
      id: stableId(agency, title, "crawl", url),
      agency,
      title,
      companyName: inferCompanyNameFromTitle(title),
      symbol: null,
      action,
      actionDate: new Date().toISOString().slice(0, 10),
      sourceUrl: url,
      snippet: null,
      collector: page.collector,
    });
  }
  return items;
}

function dedupeItems(items: CreditFeedItem[]): CreditFeedItem[] {
  const seen = new Set<string>();
  const out: CreditFeedItem[] = [];
  for (const item of items.sort((a, b) => b.actionDate.localeCompare(a.actionDate))) {
    const key = `${item.agency}|${item.title.toLowerCase().slice(0, 80)}|${item.actionDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export type FetchCreditFeedOptions = {
  /** Run Firecrawl/Crawl4AI on agency listing pages (slower; use in cron). */
  deep?: boolean;
};

export async function fetchCreditRatingFeed(opts?: FetchCreditFeedOptions): Promise<CreditFeedSnapshot> {
  const collectorsUsed = new Set<CreditFeedCollector>(["google-news"]);
  const rssBatches = await Promise.all(
    CREDIT_AGENCY_SOURCES.map((s) => fetchAgencyRssItems(s.agency, s.rssQuery)),
  );
  let items = rssBatches.flat();

  if (opts?.deep && (process.env.FIRECRAWL_API_KEY || process.env.CRAWL4AI_API_URL)) {
    const deepSources = CREDIT_AGENCY_SOURCES.slice(0, 3);
    for (const src of deepSources) {
      const extra = await fetchCrawlerSupplement(src.agency, src.listingUrl, src.host);
      for (const row of extra) collectorsUsed.add(row.collector);
      items = items.concat(extra);
    }
  }

  items = dedupeItems(items).slice(0, 120);
  const asOf = new Date().toISOString();

  if (!items.length) {
    return {
      items: [],
      asOf,
      collectorsUsed: [...collectorsUsed],
      dataStatus: "UNAVAILABLE",
      message:
        "No rating actions could be loaded from agency RSS/crawler sources. Set FIRECRAWL_API_KEY or CRAWL4AI_API_URL for JS-heavy agency pages.",
    };
  }

  return {
    items,
    asOf,
    collectorsUsed: [...collectorsUsed],
    dataStatus: "AVAILABLE",
    message: `${items.length} rating-related releases from Indian agencies (Google News RSS${opts?.deep ? " + crawler" : ""}). Verify on agency portal before trading.`,
  };
}
