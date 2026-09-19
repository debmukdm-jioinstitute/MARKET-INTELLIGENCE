import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";
import type { NewsItem } from "@/lib/feeds/types";

export async function fetchSecFilings(): Promise<NewsItem[]> {
  const url =
    "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=&company=&dateb=&owner=include&start=0&count=40&output=atom";
  const res = await feedFetch(url, {
    headers: {
      "User-Agent":
        process.env.FEED_USER_AGENT ??
        "MarketIntelligence research@getmarketintelligence.vercel.app",
    },
  });
  if (!res.ok) throw new Error(`SEC EDGAR HTTP ${res.status}`);
  const xml = await res.text();
  return parseRss(xml, "sec", 15);
}
