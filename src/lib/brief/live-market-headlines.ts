import { buildEarningsCalendarPanel } from "@/lib/feeds/earnings/build-calendar";
import { sortNewsByFreshness } from "@/lib/feeds/news-sort";
import { fetchBseNews } from "@/lib/feeds/sources/bse";
import { fetchGoogleNewsIndiaMacro } from "@/lib/feeds/sources/google-news-india";
import { fetchNseNews } from "@/lib/feeds/sources/nse";
import { fetchOpenPublisherRss } from "@/lib/feeds/sources/open-news-rss";
import { fetchRbiNews } from "@/lib/feeds/sources/rbi";
import type { FeedSourceId, NewsItem } from "@/lib/feeds/types";

export type LiveMarketHeadline = {
  title: string;
  link: string;
  source: string;
  publishedAt?: string;
  bucket: HeadlineBucket;
};

type HeadlineBucket = "exchange" | "publisher" | "search" | "earnings" | "legal";

const SOURCE_LABEL: Partial<Record<FeedSourceId, string>> = {
  rbi: "Reserve Bank of India",
  nse: "National Stock Exchange",
  bse: "Bombay Stock Exchange",
  livemint: "LiveMint",
  moneycontrol: "Moneycontrol",
  busstd: "Business Standard",
  googlenews: "Google News",
  rsswire: "News wire",
  reddit: "Reddit",
};

function bucketForSource(source: FeedSourceId): HeadlineBucket {
  if (source === "rbi" || source === "nse" || source === "bse") return "exchange";
  if (source === "googlenews") return "search";
  return "publisher";
}

function newsToHeadline(n: NewsItem): LiveMarketHeadline {
  return {
    title: n.title.trim(),
    link: n.link,
    source: SOURCE_LABEL[n.source] ?? n.source,
    publishedAt: n.publishedAt,
    bucket: bucketForSource(n.source),
  };
}

/** Round-robin across buckets so Home brief is not dominated by RBI-only exchange feeds. */
export function pickDiverseHeadlines(items: LiveMarketHeadline[], max: number): LiveMarketHeadline[] {
  if (items.length <= max) return items;
  const order: HeadlineBucket[] = ["publisher", "search", "exchange", "earnings", "legal"];
  const queues = new Map<HeadlineBucket, LiveMarketHeadline[]>();
  for (const b of order) queues.set(b, []);
  for (const item of items) {
    const q = queues.get(item.bucket) ?? [];
    q.push(item);
    queues.set(item.bucket, q);
  }
  const seen = new Set<string>();
  const out: LiveMarketHeadline[] = [];
  let progress = true;
  while (out.length < max && progress) {
    progress = false;
    for (const b of order) {
      const q = queues.get(b);
      if (!q?.length) continue;
      const next = q.shift()!;
      const key = next.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(next);
      progress = true;
      if (out.length >= max) break;
    }
  }
  return out;
}

async function earningsHeadlines(): Promise<LiveMarketHeadline[]> {
  try {
    const panel = await buildEarningsCalendarPanel();
    const soon = panel.items.filter((i) => i.period === "TODAY" || i.period === "TOMORROW").slice(0, 4);
    return soon.map((i) => ({
      title: `${i.company} (${i.symbol}) — earnings ${i.period === "TODAY" ? "today" : "tomorrow"}`,
      link: i.sourceUrl,
      source: "Earnings calendar",
      publishedAt: i.date,
      bucket: "earnings" as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Live headlines for Home brief + site-wide teaser: exchanges, publishers, Google News
 * (markets, earnings, geopolitics, fraud/regulation), and upcoming earnings.
 */
export async function fetchLiveMarketHeadlines(max = 12): Promise<LiveMarketHeadline[]> {
  const [rbi, nse, bse, publishers, google, earnings] = await Promise.all([
    fetchRbiNews().catch(() => [] as NewsItem[]),
    fetchNseNews().catch(() => [] as NewsItem[]),
    fetchBseNews().catch(() => [] as NewsItem[]),
    fetchOpenPublisherRss().catch(() => [] as NewsItem[]),
    fetchGoogleNewsIndiaMacro(6).catch(() => [] as NewsItem[]),
    earningsHeadlines(),
  ]);

  const cappedExchange = sortNewsByFreshness([
    ...rbi.slice(0, 2),
    ...nse.slice(0, 3),
    ...bse.slice(0, 3),
  ]);
  const merged = sortNewsByFreshness([
    ...publishers,
    ...google,
    ...cappedExchange,
  ]).map(newsToHeadline);

  const withEarnings = [...earnings, ...merged];
  const deduped = [...new Map(withEarnings.map((h) => [h.title.toLowerCase(), h])).values()];
  return pickDiverseHeadlines(deduped, max);
}
