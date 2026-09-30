"use client";

import type { LiveCompanySentiment } from "@/lib/reddit-sentiment/fetch-live";
import { scoreTitleSentiment } from "@/lib/reddit-sentiment/lexicon-sentiment";
import { Users, MessageSquare, ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Props {
  sentiment: LiveCompanySentiment;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RetailSentimentEngineView({ sentiment }: Props) {
  if (sentiment.fetchIssue) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border/60 shadow-sm text-center space-y-2">
        <p className="text-sm font-semibold text-foreground">Couldn't fully check Reddit for {sentiment.symbol} right now</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          {sentiment.fetchIssue}. This is a real fetch problem (Reddit rate-limiting or blocking this request), not a verified
          zero — please don't read this as "no discussion". Try again in a minute.
        </p>
      </div>
    );
  }

  if (sentiment.noData) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border/60 shadow-sm text-center space-y-2">
        <p className="text-sm font-semibold text-foreground">
          No Reddit discussion found for {sentiment.companyName} ({sentiment.symbol})
        </p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Searched the tracked India-focused subreddits for posts from the last 7 days and found none. This is the honest
          result, not an error — most Nifty 500 names simply aren't discussed on Reddit every week.
        </p>
      </div>
    );
  }

  const net = sentiment.netSentimentScore;
  const momentum =
    net > 15
      ? { icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />, label: "Bullish-leaning titles", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
      : net < -15
        ? { icon: <ArrowDownRight className="w-4 h-4 text-rose-400" />, label: "Bearish-leaning titles", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" }
        : { icon: <Minus className="w-4 h-4 text-amber-400" />, label: "Mixed / neutral titles", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {sentiment.symbol}
              </span>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{sentiment.companyName}</h3>
              <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                {sentiment.sector}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sentiment.totalMentions7D} real post{sentiment.totalMentions7D === 1 ? "" : "s"} found across the tracked
              subreddits in the last 7 days, fetched {timeAgo(sentiment.fetchedAt)}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">7D real mentions</span>
              <span className="text-base font-bold text-foreground tabular-nums">{sentiment.totalMentions7D}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${momentum.cls}`}>
              {momentum.icon}
              <span className="text-xs font-semibold">{momentum.label}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                Positive: <strong className="tabular-nums">{sentiment.positivePct}%</strong>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                Negative: <strong className="tabular-nums">{sentiment.negativePct}%</strong>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground inline-block" />
                Neutral: <strong className="tabular-nums">{sentiment.neutralPct}%</strong>
              </span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              Net score:{" "}
              <strong className={net > 0 ? "text-emerald-400" : net < 0 ? "text-rose-400" : "text-muted-foreground"}>
                {net > 0 ? `+${net}` : net}
              </strong>
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden flex">
            <div style={{ width: `${sentiment.positivePct}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
            <div style={{ width: `${sentiment.neutralPct}%` }} className="bg-amber-500/70 h-full transition-all duration-500" />
            <div style={{ width: `${sentiment.negativePct}%` }} className="bg-rose-500 h-full transition-all duration-500" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {sentiment.sentimentSource === "finbert"
              ? "Scored by ProsusAI/FinBERT on real post titles — a trained financial-sentiment model, still imperfect on slang and sarcasm."
              : "FinBERT was unavailable this run — falling back to keyword-based scoring on real post titles. Sarcasm, slang and negation can flip this."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-3.5">
          <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>Where the real mentions came from</span>
          </h4>
          {sentiment.communityDistribution.length === 0 ? (
            <p className="text-xs text-muted-foreground">No community breakdown — no posts found.</p>
          ) : (
            <div className="space-y-2.5">
              {sentiment.communityDistribution.map((c) => (
                <div key={c.subreddit} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-foreground/90">{c.subreddit}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {c.percentage}% ({c.postCount} post{c.postCount === 1 ? "" : "s"})
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                    <div style={{ width: `${c.percentage}%` }} className="h-full bg-primary/70 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Real recent posts</span>
            </span>
            <span className="text-xs font-normal text-muted-foreground">Every one links to the actual live thread</span>
          </h4>

          <div className="space-y-3">
            {sentiment.topPosts.map((p) => {
              const score = scoreTitleSentiment(p.title);
              const tone = score.positive && !score.negative ? "border-emerald-500/30 bg-emerald-500/5" : score.negative && !score.positive ? "border-rose-500/30 bg-rose-500/5" : "border-border/60 bg-card";
              return (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 rounded-xl border transition-all hover:border-primary/40 shadow-sm ${tone}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground font-medium leading-snug">{p.title}</p>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="font-medium text-primary">{p.subreddit}</span>
                    <span>{timeAgo(p.createdAt)}</span>
                    <span>{p.score} upvotes</span>
                    <span>{p.numComments} comments</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
