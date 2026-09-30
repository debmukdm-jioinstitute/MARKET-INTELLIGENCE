"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MessageSquare, Flame, Search } from "lucide-react";
import { getAllRetailSentimentData, TRACKED_SUBREDDITS } from "@/lib/reddit-sentiment/database";
import { capTierLabel, type Nifty500CapTier } from "@/lib/reddit-sentiment/nifty500-cap-tier";
import { cn } from "@/lib/utils";

const CAP_FILTERS: { id: "ALL" | Nifty500CapTier; label: string }[] = [
  { id: "ALL", label: "All Nifty 500" },
  { id: "LARGE_CAP", label: "Large cap" },
  { id: "MID_CAP", label: "Mid cap" },
  { id: "SMALL_CAP", label: "Small cap" },
];

const PREVIEW_COUNT = 8;

export function SocialsSentimentSneakPeek() {
  const [capFilter, setCapFilter] = useState<"ALL" | Nifty500CapTier>("ALL");
  const hub = useMemo(() => getAllRetailSentimentData(), []);

  const filtered = useMemo(() => {
    if (capFilter === "ALL") return hub.companies;
    return hub.companies.filter((c) => c.marketCapTier === capFilter);
  }, [hub.companies, capFilter]);

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
              Retail Sentiment Engine & Search-Trend Velocity
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
            Nifty 500 · {hub.companies.length} names
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
            {f.id !== "ALL" ? (
              <span className="ml-1 tabular-nums opacity-80">
                ({hub.companies.filter((c) => c.marketCapTier === f.id).length})
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 sm:pb-0">
        {preview.map((c) => {
          const isBullish = c.sentimentMomentum.includes("BULLISH");
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
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                    )}
                  >
                    <Flame className="size-3" />
                    +{c.mentionChangePct7D}% Buzz
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
                <p className="text-xs text-muted-foreground">
                  {c.totalMentions7D.toLocaleString("en-IN")} weekly discussions
                </p>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Bullish sentiment</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {c.positivePct}% positive
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Net score</span>
                  <span className="font-semibold text-foreground tabular-nums">+{c.netSentimentScore} pts</span>
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
            </Link>
          );
        })}
      </div>

      {filtered.length > PREVIEW_COUNT ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Showing top {PREVIEW_COUNT} by buzz of {filtered.length} {capFilter === "ALL" ? "Nifty 500" : capTierLabel(capFilter).toLowerCase()} names — open desk for full matrix.
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
        <span className="text-xs text-muted-foreground">
          Crawls r/IndianStreetBets, r/IndiaInvestments, and search trends across large, mid, and small caps in the Nifty 500.
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
