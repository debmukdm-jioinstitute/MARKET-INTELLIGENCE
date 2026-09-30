import { feedFetch } from "@/lib/feeds/http";
import { parseRss } from "@/lib/feeds/rss";

const REDDIT_WWW = "https://www.reddit.com";
const REDDIT_OAUTH = "https://oauth.reddit.com";

let tokenCache: { token: string; expMs: number } | null = null;

/** Reddit API rules: platform:appId:version (by /u/username) or FEED_USER_AGENT override. */
export function redditUserAgent(): string {
  const custom = process.env.REDDIT_USER_AGENT?.trim() || process.env.FEED_USER_AGENT?.trim();
  if (custom) return custom;
  return "web:market-intelligence:v1.0.0 (+https://getmarketintelligence.in; contact feeds@getmarketintelligence.in)";
}

export function isRedditOAuthConfigured(): boolean {
  const id = process.env.REDDIT_CLIENT_ID?.trim();
  const secret = process.env.REDDIT_CLIENT_SECRET?.trim();
  if (!id || !secret) return false;
  return Boolean(
    process.env.REDDIT_REFRESH_TOKEN?.trim() ||
      (process.env.REDDIT_USERNAME?.trim() && process.env.REDDIT_PASSWORD?.trim()),
  );
}

async function requestAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const refresh = process.env.REDDIT_REFRESH_TOKEN?.trim();
  const username = process.env.REDDIT_USERNAME?.trim();
  const password = process.env.REDDIT_PASSWORD?.trim();

  let body: string;
  if (refresh) {
    body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }).toString();
  } else if (username && password) {
    body = new URLSearchParams({
      grant_type: "password",
      username,
      password,
    }).toString();
  } else {
    return null;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await feedFetch(`${REDDIT_WWW}/api/v1/access_token`, {
    method: "POST",
    timeoutMs: 12_000,
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": redditUserAgent(),
    },
    body,
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  const ttlSec = typeof json.expires_in === "number" ? json.expires_in : 3600;
  tokenCache = { token: json.access_token, expMs: Date.now() + Math.max(60, ttlSec - 120) * 1000 };
  return json.access_token;
}

export async function getRedditAccessToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expMs) return tokenCache.token;
  tokenCache = null;
  return requestAccessToken();
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type RedditSearchChild = {
  data?: {
    id?: string;
    title?: string;
    permalink?: string;
    created_utc?: number;
    score?: number;
    num_comments?: number;
    stickied?: boolean;
  };
};

type RedditSearchListing = { data?: { children?: RedditSearchChild[] } };

export type RedditSearchHit = {
  id: string;
  title: string;
  permalink: string;
  createdUtc: number;
  score: number;
  numComments: number;
};

function hitsFromListing(json: RedditSearchListing): RedditSearchHit[] {
  const out: RedditSearchHit[] = [];
  for (const child of json.data?.children ?? []) {
    const d = child.data;
    if (!d?.title || !d.id || !d.permalink || d.stickied) continue;
    out.push({
      id: d.id,
      title: d.title,
      permalink: d.permalink.startsWith("http") ? d.permalink : `${REDDIT_WWW}${d.permalink}`,
      createdUtc: typeof d.created_utc === "number" ? d.created_utc : Math.floor(Date.now() / 1000),
      score: d.score ?? 0,
      numComments: d.num_comments ?? 0,
    });
  }
  return out;
}

function hitsFromSearchRss(xml: string, limit: number): RedditSearchHit[] {
  const items = parseRss(xml, "reddit", limit);
  const out: RedditSearchHit[] = [];
  for (const item of items) {
    const m = /reddit\.com\/r\/[^/]+\/comments\/([a-z0-9]+)\//i.exec(item.link);
    if (!m) continue;
    const ts = item.publishedAt ? Math.floor(new Date(item.publishedAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
    out.push({
      id: m[1]!,
      title: item.title.replace(/^\[r\/[^\]]+\]\s*/i, ""),
      permalink: item.link.split("?")[0] ?? item.link,
      createdUtc: ts,
      score: 0,
      numComments: 0,
    });
  }
  return out;
}

/**
 * Search one subreddit (last 7 days). Tries OAuth JSON first, then public JSON, then search RSS.
 * Returns ok:false only when every attempt failed — not when the search succeeded with zero posts.
 */
export async function redditSubredditSearch(
  subredditSlug: string,
  query: string,
  limit = 20,
): Promise<{ ok: true; hits: RedditSearchHit[]; via: "oauth" | "public" | "rss" } | { ok: false; reason: string }> {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: "on",
    sort: "new",
    t: "week",
    limit: String(limit),
    raw_json: "1",
  });
  const jsonPath = `/r/${encodeURIComponent(subredditSlug)}/search.json?${params.toString()}`;
  const rssPath = `/r/${encodeURIComponent(subredditSlug)}/search.rss?${new URLSearchParams({
    q: query,
    restrict_sr: "1",
    sort: "new",
    t: "week",
  }).toString()}`;

  const token = await getRedditAccessToken();
  if (token) {
    try {
      const res = await feedFetch(`${REDDIT_OAUTH}${jsonPath}`, {
        timeoutMs: 12_000,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": redditUserAgent(),
        },
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("json")) {
          const json = (await res.json()) as RedditSearchListing;
          return { ok: true, hits: hitsFromListing(json), via: "oauth" };
        }
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const res = await feedFetch(`${REDDIT_WWW}${rssPath}`, {
      timeoutMs: 12_000,
      headers: { Accept: "application/atom+xml, application/xml, text/xml", "User-Agent": redditUserAgent() },
    });
    if (res.ok) {
      const xml = await res.text();
      return { ok: true, hits: hitsFromSearchRss(xml, limit), via: "rss" };
    }
    if (res.status !== 403 && res.status !== 429) {
      return { ok: false, reason: `HTTP ${res.status}` };
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "request failed" };
  }

  try {
    const res = await feedFetch(`${REDDIT_WWW}${jsonPath}`, {
      timeoutMs: 12_000,
      headers: { Accept: "application/json", "User-Agent": redditUserAgent() },
    });
    if (res.ok) {
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("json")) {
        const json = (await res.json()) as RedditSearchListing;
        return { ok: true, hits: hitsFromListing(json), via: "public" };
      }
      return { ok: false, reason: "non-JSON response (likely blocked or rate-limited)" };
    }
    if (res.status !== 403 && res.status !== 429) {
      return { ok: false, reason: `HTTP ${res.status}` };
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "request failed" };
  }

  return { ok: false, reason: "HTTP 429 (JSON blocked; RSS fallback failed)" };
}
