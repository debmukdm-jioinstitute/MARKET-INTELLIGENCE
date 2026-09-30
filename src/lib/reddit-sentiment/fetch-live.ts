import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { getNifty500CapTier } from "./nifty500-cap-tier";
import { tallySentiment } from "./lexicon-sentiment";
import { TRACKED_SUBREDDITS } from "./tracked-subreddits";
import type { TrackedSubredditId } from "./types";
import { classifyFinancialSentiment } from "@/lib/hf/finbert";
import { fetchRedditHitsViaGoogleNews } from "./google-news-reddit-fallback";
import { isRedditOAuthConfigured, redditSubredditSearch, sleep } from "./reddit-http";

/** FinBERT-scored tally, batched (its own client caps at 5 texts/call). Falls back to the
 * deterministic lexicon tally on any HF failure — never blocks or breaks the page. */
async function tallyWithFinbert(titles: string[]): Promise<{ tally: ReturnType<typeof tallySentiment>; source: "finbert" | "lexicon" }> {
  if (titles.length === 0) return { tally: tallySentiment(titles), source: "lexicon" };
  try {
    const capped = titles.slice(0, 12);
    const results: Awaited<ReturnType<typeof classifyFinancialSentiment>> = [];
    for (let i = 0; i < capped.length; i += 5) {
      results.push(...(await classifyFinancialSentiment(capped.slice(i, i + 5))));
    }
    let pos = 0, neg = 0;
    for (const r of results) {
      if (r.label === "positive") pos++;
      else if (r.label === "negative") neg++;
    }
    const n = results.length;
    const positivePct = Math.round((pos / n) * 100);
    const negativePct = Math.round((neg / n) * 100);
    return {
      tally: { positivePct, negativePct, neutralPct: Math.max(0, 100 - positivePct - negativePct), netSentimentScore: positivePct - negativePct },
      source: "finbert",
    };
  } catch {
    return { tally: tallySentiment(titles), source: "lexicon" };
  }
}

/**
 * Real Reddit data collection for the Retail Sentiment Engine. Every number this module returns
 * traces back to an actual public Reddit post fetched at request time — no per-symbol fixtures,
 * no hash-seeded random generator standing in for "any name you type". See lexicon-sentiment.ts
 * for why the positive/negative split is a rough keyword score, not a trained classifier.
 */

const REDDIT_BASE = "https://www.reddit.com";

export type LiveRedditPost = {
  id: string;
  subreddit: TrackedSubredditId;
  title: string;
  url: string;
  createdAt: string;
  score: number;
  numComments: number;
};

type SubredditResult = { ok: true; posts: LiveRedditPost[] } | { ok: false; reason: string };

async function searchSubredditRecent(subreddit: TrackedSubredditId, query: string, limit = 20): Promise<SubredditResult> {
  const slug = subreddit.replace(/^r\//, "");
  const result = await redditSubredditSearch(slug, query, limit);
  if (!result.ok) return { ok: false, reason: result.reason };
  const posts: LiveRedditPost[] = result.hits.map((h) => ({
    id: h.id,
    subreddit,
    title: h.title,
    url: h.permalink.startsWith("http") ? h.permalink : `${REDDIT_BASE}${h.permalink}`,
    createdAt: new Date(h.createdUtc * 1000).toISOString(),
    score: h.score,
    numComments: h.numComments,
  }));
  return { ok: true, posts };
}

export type LiveCompanySentiment = {
  symbol: string;
  companyName: string;
  sector: string;
  marketCapTier?: "LARGE_CAP" | "MID_CAP" | "SMALL_CAP";
  /** True when every tracked subreddit was reachable and none had a real post in the last 7 days — a verified, honest zero. */
  noData: boolean;
  /** Set when at least one subreddit request failed (blocked, rate-limited, timed out) — a zero result under this must NOT be shown as a verified "no discussion", since it's really "couldn't check". Null when every request succeeded. */
  fetchIssue: string | null;
  totalMentions7D: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  netSentimentScore: number;
  communityDistribution: { subreddit: TrackedSubredditId; percentage: number; postCount: number }[];
  /** Real posts, most recent first, capped for the UI. Every one links to the actual live thread. */
  topPosts: LiveRedditPost[];
  fetchedAt: string;
  /** Which engine produced positivePct/negativePct/netSentimentScore: FinBERT (real classifier)
   * when available, deterministic keyword lexicon as a fallback if the HF call fails. */
  sentimentSource: "finbert" | "lexicon";
};

const INDIA_SUBREDDITS: TrackedSubredditId[] = TRACKED_SUBREDDITS.filter((s) => s.geoFocus === "India").map((s) => s.id);

/** Real, on-demand fetch across the India-focused tracked subreddits for one company. Runs the per-subreddit searches concurrently; total wall time is bounded by the slowest single subreddit, not the sum. */
export async function fetchLiveCompanySentiment(symbolRaw: string): Promise<LiveCompanySentiment> {
  const symbol = symbolRaw.toUpperCase().trim();
  const row = NIFTY_500.find(([s]) => s === symbol);
  const companyName = row?.[1] ?? symbol;
  const sector = row?.[2] ?? "Unclassified";

  // Search by company name when we know it (more real matches than a bare ticker, which is often
  // ambiguous or absent from post text), falling back to the raw symbol for anything not in the
  // curated Nifty 500 list.
  const query = row ? `"${companyName}" OR ${symbol}` : symbol;

  const perSub: SubredditResult[] = [];
  for (let i = 0; i < INDIA_SUBREDDITS.length; i++) {
    perSub.push(await searchSubredditRecent(INDIA_SUBREDDITS[i]!, query));
    if (i < INDIA_SUBREDDITS.length - 1) await sleep(900);
  }
  const failures = perSub.filter((r): r is { ok: false; reason: string } => !r.ok);
  let posts = perSub
    .filter((r): r is { ok: true; posts: LiveRedditPost[] } => r.ok)
    .flatMap((r) => r.posts)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (posts.length === 0 && failures.length > 0) {
    const { hits, subredditById } = await fetchRedditHitsViaGoogleNews(symbol, companyName, INDIA_SUBREDDITS);
    if (hits.length > 0) {
      posts = hits.map((h) => ({
        id: h.id,
        subreddit: subredditById.get(h.id) ?? INDIA_SUBREDDITS[0]!,
        title: h.title,
        url: h.permalink.startsWith("http") ? h.permalink : `${REDDIT_BASE}${h.permalink}`,
        createdAt: new Date(h.createdUtc * 1000).toISOString(),
        score: h.score,
        numComments: h.numComments,
      }));
    }
  }

  let fetchIssue =
    failures.length > 0 && posts.length === 0
      ? `${failures.length}/${INDIA_SUBREDDITS.length} communities could not be reached (${failures[0]!.reason})${
          !isRedditOAuthConfigured() && failures.some((f) => f.reason.includes("403") || f.reason.includes("429"))
            ? ". Add REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET + REDDIT_REFRESH_TOKEN on Vercel for reliable access"
            : ""
        }`
      : failures.length > 0 && posts.length > 0
        ? `${failures.length}/${INDIA_SUBREDDITS.length} communities unreachable — showing partial results`
        : null;

  const bySub = new Map<TrackedSubredditId, number>();
  for (const p of posts) bySub.set(p.subreddit, (bySub.get(p.subreddit) ?? 0) + 1);
  const communityDistribution = [...bySub.entries()]
    .map(([subreddit, postCount]) => ({ subreddit, postCount, percentage: Math.round((postCount / posts.length) * 100) }))
    .sort((a, b) => b.postCount - a.postCount);

  const { tally, source } = await tallyWithFinbert(posts.map((p) => p.title));

  return {
    symbol,
    companyName,
    sector,
    marketCapTier: getNifty500CapTier(symbol),
    noData: posts.length === 0 && !fetchIssue,
    fetchIssue,
    totalMentions7D: posts.length,
    positivePct: tally.positivePct,
    negativePct: tally.negativePct,
    neutralPct: tally.neutralPct,
    netSentimentScore: tally.netSentimentScore,
    communityDistribution,
    topPosts: posts.slice(0, 12),
    fetchedAt: new Date().toISOString(),
    sentimentSource: source,
  };
}
