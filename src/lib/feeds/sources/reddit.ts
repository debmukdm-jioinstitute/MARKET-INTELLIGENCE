import { feedFetch } from "@/lib/feeds/http";
import { redditSubredditSearch, redditUserAgent, getRedditAccessToken } from "@/lib/reddit-sentiment/reddit-http";
import { redditSubreddits } from "@/lib/feeds/open-news-config";
import type { NewsItem } from "@/lib/feeds/types";

type RedditPost = {
  title?: string;
  url?: string;
  permalink?: string;
  created_utc?: number;
  id?: string;
  stickied?: boolean;
};

type RedditListing = {
  data?: {
    children?: { data?: RedditPost }[];
  };
};

const REDDIT_OAUTH = "https://oauth.reddit.com";
const REDDIT_BASE = "https://www.reddit.com";

function redditLink(data: RedditPost | undefined) {
  if (!data) return "";
  if (data.url?.startsWith("http") && !data.url.includes("reddit.com")) return data.url;
  if (data.permalink) return `${REDDIT_BASE}${data.permalink}`;
  return data.url ?? "";
}

export async function fetchRedditCommunityNews(limitPerSub = 12): Promise<NewsItem[]> {
  const subs = redditSubreddits();
  const token = await getRedditAccessToken();
  const batches = await Promise.all(
    subs.map(async (sub) => {
      if (token) {
        const url = `${REDDIT_OAUTH}/r/${encodeURIComponent(sub)}/new.json?limit=${Math.min(limitPerSub, 25)}&raw_json=1`;
        try {
          const res = await feedFetch(url, {
            timeoutMs: 12_000,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "User-Agent": redditUserAgent(),
            },
          });
          if (res.ok) return listingToNews(res, sub, limitPerSub);
        } catch {
          /* fall through */
        }
      }
      const url = `${REDDIT_BASE}/r/${encodeURIComponent(sub)}/new.json?limit=${Math.min(limitPerSub, 25)}&raw_json=1`;
      try {
        const res = await feedFetch(url, {
          timeoutMs: 12_000,
          headers: { Accept: "application/json", "User-Agent": redditUserAgent() },
        });
        if (res.ok) return listingToNews(res, sub, limitPerSub);
      } catch {
        return [];
      }
      return [];
    }),
  );
  return batches.flat();
}

async function listingToNews(res: Response, sub: string, limitPerSub: number): Promise<NewsItem[]> {
  const json = (await res.json()) as RedditListing;
  const children = json.data?.children ?? [];
  const items: NewsItem[] = [];
  for (const child of children) {
    const d = child.data;
    if (!d?.title || d.stickied) continue;
    const link = redditLink(d);
    if (!link) continue;
    const publishedAt =
      typeof d.created_utc === "number"
        ? new Date(d.created_utc * 1000).toISOString()
        : undefined;
    const id = `reddit-${sub}-${d.id ?? Buffer.from(link).toString("base64url").slice(0, 16)}`;
    items.push({
      id,
      source: "reddit",
      title: `[r/${sub}] ${d.title}`,
      link,
      publishedAt,
    });
    if (items.length >= limitPerSub) break;
  }
  return items;
}
