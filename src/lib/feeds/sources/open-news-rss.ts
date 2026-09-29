import { feedFetch } from "@/lib/feeds/http";
import { openRssFeeds } from "@/lib/feeds/open-news-config";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

export async function fetchOpenPublisherRss(): Promise<NewsItem[]> {
  const feeds = openRssFeeds();
  const batches = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const res = await feedFetch(feed.url, { timeoutMs: 12_000 });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRss(xml, feed.source, feed.limit).map((item) => ({
          ...item,
          id: `${feed.source}-${item.id}`,
        }));
      } catch {
        return [];
      }
    }),
  );
  return batches.flat();
}
