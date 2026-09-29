import { feedFetch } from "@/lib/feeds/http";
import { googleNewsMacroQueries } from "@/lib/feeds/open-news-config";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

function googleNewsRssUrl(query: string) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
}

export async function fetchGoogleNewsIndiaMacro(limitPerQuery = 8): Promise<NewsItem[]> {
  const queries = googleNewsMacroQueries();
  const batches = await Promise.all(
    queries.map(async ({ query, tag }) => {
      try {
        const res = await feedFetch(googleNewsRssUrl(query), { timeoutMs: 14_000 });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRss(xml, "googlenews", limitPerQuery).map((item) => ({
          ...item,
          id: `gn-${tag}-${item.id}`,
          title: item.title.startsWith("[") ? item.title : `[${tag}] ${item.title}`,
        }));
      } catch {
        return [];
      }
    }),
  );
  return batches.flat();
}
