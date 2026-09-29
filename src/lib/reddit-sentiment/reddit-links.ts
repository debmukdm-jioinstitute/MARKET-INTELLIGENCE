import type { TrackedSubredditId } from "@/lib/reddit-sentiment/types";

/** Reddit in-subreddit search for posts/comments mentioning a ticker (opens live threads). */
export function subredditSearchUrl(
  subreddit: TrackedSubredditId,
  query: string,
  opts?: { time?: "week" | "month" | "year" },
): string {
  const slug = subreddit.replace(/^r\//, "");
  const params = new URLSearchParams({
    q: query.trim(),
    restrict_sr: "on",
    sort: "relevance",
    t: opts?.time ?? "month",
  });
  return `https://www.reddit.com/r/${slug}/search/?${params.toString()}`;
}

export function subredditSymbolDiscussionUrl(
  subreddit: TrackedSubredditId,
  symbol: string,
  opts?: { companyName?: string; topic?: string; time?: "week" | "month" | "year" },
): string {
  const terms = new Set<string>([symbol.toUpperCase()]);
  if (opts?.companyName) {
    for (const word of opts.companyName.split(/\s+/)) {
      const w = word.replace(/[^\w&]/g, "");
      if (w.length >= 4) terms.add(w);
    }
  }
  if (opts?.topic) {
    for (const word of opts.topic.split(/\s+/).filter((w) => w.length > 3).slice(0, 5)) {
      terms.add(word.replace(/[^\w&]/g, ""));
    }
  }
  return subredditSearchUrl(subreddit, [...terms].join(" "), opts);
}
