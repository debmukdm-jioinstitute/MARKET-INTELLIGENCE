import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

const FEEDS = [
  "https://www.bseindia.com/data/xml/notices.xml",
  "https://www.bseindia.com/xml-data/corpfiling/CorpFiling.xml",
];

export async function fetchBseNews(): Promise<NewsItem[]> {
  for (const url of FEEDS) {
    try {
      const res = await feedFetch(url, {
        headers: { Referer: "https://www.bseindia.com/" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRss(xml, "bse", 10);
      if (items.length) return items;
    } catch {
      /* try next */
    }
  }
  return [];
}
