"use client";

import type { CompanyRetailSentiment } from "@/lib/reddit-sentiment/types";
import { subredditSymbolDiscussionUrl } from "@/lib/reddit-sentiment/reddit-links";
import { ExternalLink, Users } from "lucide-react";

type Props = {
  sentiment: CompanyRetailSentiment;
  className?: string;
};

/** Subreddit share bars — each channel links to Reddit search for that ticker in the community. */
export function DiscussionDistribution({ sentiment, className }: Props) {
  const hasHistory =
    sentiment.sentimentHistory30D && sentiment.sentimentHistory30D.length > 0;
  const hasDist =
    sentiment.communityDistribution && sentiment.communityDistribution.length > 0;

  return (
    <div
      className={
        className ??
        "p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-3.5"
      }
    >
      <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <span>Discussion Distribution</span>
      </h4>
      <p className="text-xs text-muted-foreground">
        Subreddit breakdown where retail traders and investors actively mention{" "}
        {sentiment.symbol}. Click a channel to open recent Reddit threads about
        this stock.
      </p>

      {hasDist ? (
        <div className="space-y-2.5 pt-1">
          {sentiment.communityDistribution.map((c) => {
            const href = subredditSymbolDiscussionUrl(
              c.subreddit,
              sentiment.symbol,
              {
                companyName: sentiment.companyName,
              }
            );
            return (
              <a
                key={c.subreddit}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block space-y-1 rounded-lg px-1 py-1 -mx-1 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                title={`Search ${sentiment.symbol} on ${c.subreddit}`}
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-semibold text-foreground/90 group-hover:text-primary inline-flex items-center gap-1">
                    {c.subreddit}
                    <ExternalLink
                      className="size-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      aria-hidden
                    />
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {c.percentage}% ({c.postCount.toLocaleString("en-IN")}{" "}
                    posts)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div
                    style={{ width: `${c.percentage}%` }}
                    className="h-full bg-primary/70 rounded-full group-hover:bg-primary transition-colors"
                  />
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="p-3 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-border/40">
          No concentrated subreddit cluster detected for {sentiment.symbol}.
        </div>
      )}

      {hasHistory && (
        <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">30-Day Momentum:</span>{" "}
          Mentions expanded from{" "}
          <span className="tabular-nums">
            {sentiment.sentimentHistory30D[0]?.mentions}
          </span>{" "}
          to{" "}
          <span className="tabular-nums text-primary font-semibold">
            {
              sentiment.sentimentHistory30D[
                sentiment.sentimentHistory30D.length - 1
              ]?.mentions
            }
          </span>{" "}
          posts/week.
        </div>
      )}
    </div>
  );
}
