"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MessageSquare, Flame, Search, Loader2 } from "lucide-react";
import { TRACKED_SUBREDDITS } from "@/lib/reddit-sentiment/tracked-subreddits";
import { capTierLabel, type Nifty500CapTier } from "@/lib/reddit-sentiment/nifty500-cap-tier";
import type { LiveCompanySentiment } from "@/lib/reddit-sentiment/fetch-live";
import { cn } from "@/lib/utils";

const CAP_FILTERS: { id: "ALL" | Nifty500CapTier; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "LARGE_CAP", label: "Large cap" },
  { id: "MID_CAP", label: "Mid cap" },
  { id: "SMALL_CAP", label: "Small cap" },
];

/** Small, liquid watchlist checked live on every dashboard load — not a claim about full Nifty
 * 500 coverage. A real-time Reddit sweep across 500 names isn't something a dashboard card can
 * honestly do; this trades breadth for every number here being real. */
const WATCHLIST = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN",
  "TATAMOTORS", "ITC", "ZOMATO", "SUZLON", "ADANIENT", "BHARTIARTL",
];

const PREVIEW_COUNT = 8;

export function SocialsSentimentSneakPeek() {
  const [capFilter, setCapFilter] = useState<"ALL" | Nifty500CapTier>("ALL");
  const [results, setResults] = useState<LiveCompanySentiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settled = await Promise.allSettled(
        WATCHLIST.map(async (symbol) => {
          const res = await fetch(`/api/reddit/sentiment/${encodeURIComponent(symbol)}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as { sentiment: LiveCompanySentiment };
          return json.sentiment;
        }),
      );
      if (cancelled) return;
      const ok = settled
        .filter((r): r is PromiseFulfilledResult<LiveCompanySentiment> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((s) => !s.fetchIssue && s.totalMentions7D > 0);
      setResults(ok);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const base = capFilter === "ALL" ? results : results.filter((c) => c.marketCapTier === capFilter);
    return [...base].sort((a, b) => b.totalMentions7D - a.totalMentions7D);
  }, [results, capFilter]);

  const preview = filtered.slice(0, PREVIEW_COUNT);

  return (
    <div className="bento-card-shell bento-card-stack rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <MessageSquare className="size-4" />
          </span>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Alternative Data & Socials
            </p>
            <h2 className="text-sm sm:text-lg font-bold text-foreground">
              Retail Sentiment Engine · live Reddit check
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
            {WATCHLIST.length} tracked names
          </span>
          <span className="rounded-md bg-muted/60 px-2 py-0.5 font-semibold">
            {TRACKED_SUBREDDITS.length} communities
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CAP_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCapFilter(f.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
              capFilter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking Reddit for real-time mentions…
        </div>
      ) : preview.length === 0 ? (
        <p className="mt-4 py-6 text-sm text-muted-foreground">
          No live Reddit discussion found for tracked names right now — check back later or open the full desk.
        </p>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 sm:pb-0">
          {preview.map((c) => {
            const isBullish = c.netSentimentScore > 15;
            const isBearish = c.netSentimentScore < -15;
            const href = `/research/${encodeURIComponent(c.symbol)}`;
            return (
              <Link
                key={c.symbol}
                href={href}
                className="group flex min-w-[16.5rem] shrink-0 snap-start flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30 sm:min-w-0"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {c.symbol}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                        isBullish
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : isBearish
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Flame className="size-3" />
                      {c.totalMentions7D} posts/7d
                    </span>
                  </div>
                  {c.marketCapTier ? (
                    <span className="mt-1.5 inline-block rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {capTierLabel(c.marketCapTier)}
                    </span>
                  ) : null}
                  <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                    {c.companyName}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {c.topPosts[0]?.title ?? "Real posts from tracked communities"}
                  </p>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Positive (keyword-based)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {c.positivePct}%
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Net score</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {c.netSentimentScore >= 0 ? "+" : ""}
                      {c.netSentimentScore} pts
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
        <span className="text-xs text-muted-foreground">
          Live search of r/IndianStreetBets, r/IndiaInvestments and tracked India communities for a fixed watchlist — not fabricated, not full Nifty 500 coverage.
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/intelligence/search-trends"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline touch-manipulation"
          >
            <Search className="size-3" />
            Search trends
          </Link>
          <Link
            href="/intelligence/reddit"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline touch-manipulation"
          >
            Open retail sentiment engine
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
