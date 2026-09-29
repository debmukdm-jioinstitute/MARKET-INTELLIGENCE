"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, MessageSquare, Flame, Sparkles, TrendingUp, Search } from "lucide-react";
import { getAllRetailSentimentData, TRACKED_SUBREDDITS } from "@/lib/reddit-sentiment/database";
import { cn } from "@/lib/utils";

export function SocialsSentimentSneakPeek() {
  const data = useMemo(() => getAllRetailSentimentData(), []);
  const companies = data.companies.slice(0, 4);

  return (
    <div className="bento-card-shell bento-card-stack rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
      {/* Header */}
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
              Retail Sentiment Engine & Search-Trend Velocity
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
            {TRACKED_SUBREDDITS.length} Investing Communities Tracked
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {companies.map((c) => {
          const isBullish = c.sentimentMomentum.includes("BULLISH");
          return (
            <div
              key={c.symbol}
              className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {c.symbol}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                      isBullish
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    <Flame className="size-3" />
                    +{c.mentionChangePct7D}% Buzz
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                  {c.companyName}
                </h4>
                <p className="text-xs text-muted-foreground">{c.totalMentions7D.toLocaleString("en-IN")} Weekly Discussions</p>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Bullish Sentiment</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {c.positivePct}% Positive
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Net Sentiment Score</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    +{c.netSentimentScore} pts
                  </span>
                </div>
                <div className="pt-1 flex flex-wrap gap-1">
                  {c.mostDiscussedTopics.slice(0, 3).map((topic, i) => (
                    <span
                      key={i}
                      className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          Crawls r/IndianStreetBets, r/IndiaInvestments, and Google Search Trends to quantify retail sentiment and demand spikes.
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/intelligence/search-trends"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline touch-manipulation"
          >
            <Search className="size-3" />
            Search Trends
          </Link>
          <Link
            href="/intelligence/reddit"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline touch-manipulation"
          >
            Open Retail Sentiment Engine <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
