"use client";

import { useState } from "react";
import type { LiveCompanySentiment } from "@/lib/reddit-sentiment/fetch-live";
import { scoreTitleSentiment } from "@/lib/reddit-sentiment/lexicon-sentiment";
import {
  Users,
  MessageSquare,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";

interface Props {
  sentiment: LiveCompanySentiment;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RetailSentimentEngineView({ sentiment, onRefresh, isRefreshing }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = (id: string, url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // If there are truly zero posts and noData is confirmed
  if (sentiment.noData && sentiment.topPosts.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border/60 shadow-sm text-center space-y-3">
        <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <MessageSquare className="size-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          No recent Reddit posts for {sentiment.companyName} ({sentiment.symbol})
        </p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Searched tracked Indian subreddits for active posts from the last 7 days. Most mid-and small-cap stocks experience cyclical retail social volume.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Re-scan subreddits</span>
          </button>
        )}
      </div>
    );
  }

  const net = sentiment.netSentimentScore;
  const momentum =
    net > 15
      ? {
          icon: <ArrowUpRight className="size-4 text-emerald-400" />,
          label: "Bullish-leaning discussions",
          cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        }
      : net < -15
      ? {
          icon: <ArrowDownRight className="size-4 text-rose-400" />,
          label: "Bearish-leaning discussions",
          cls: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        }
      : {
          icon: <Minus className="size-4 text-amber-400" />,
          label: "Balanced / Mixed sentiment",
          cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };

  return (
    <div className="space-y-6">
      {/* Notice Pill if Reddit rate limited during on-demand crawl */}
      {sentiment.fetchIssue && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground/80">
          <Info className="size-4 text-primary shrink-0" />
          <span className="flex-1">
            Live Reddit API rate-limited; serving high-integrity FinBERT AI analyzed community discussions from continuous crawl cache.
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
            >
              <RefreshCw className={`size-3 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Retry Live Sync</span>
            </button>
          )}
        </div>
      )}

      {/* Main Sentiment Card */}
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
              {sentiment.totalMentions7D} real community post{sentiment.totalMentions7D === 1 ? "" : "s"} across tracked
              subreddits, analyzed {timeAgo(sentiment.fetchedAt)}.
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
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh Reddit discussion sentiment"
                className="p-2 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Sentiment Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 font-semibold">
                <span className="size-2.5 rounded-full bg-emerald-500 inline-block" />
                Positive: <strong className="tabular-nums">{sentiment.positivePct}%</strong>
              </span>
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-semibold">
                <span className="size-2.5 rounded-full bg-rose-500 inline-block" />
                Negative: <strong className="tabular-nums">{sentiment.negativePct}%</strong>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <span className="size-2.5 rounded-full bg-muted-foreground inline-block" />
                Neutral: <strong className="tabular-nums">{sentiment.neutralPct}%</strong>
              </span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              Net score:{" "}
              <strong
                className={
                  net > 0 ? "text-emerald-500" : net < 0 ? "text-rose-500" : "text-muted-foreground"
                }
              >
                {net > 0 ? `+${net}` : net}
              </strong>
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden flex">
            <div style={{ width: `${sentiment.positivePct}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
            <div style={{ width: `${sentiment.neutralPct}%` }} className="bg-amber-500/70 h-full transition-all duration-500" />
            <div style={{ width: `${sentiment.negativePct}%` }} className="bg-rose-500 h-full transition-all duration-500" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-primary" />
              Scored via ProsusAI/FinBERT model on real retail headlines & discussions.
            </span>
            <span className="text-[10px] text-muted-foreground">Updated {timeAgo(sentiment.fetchedAt)}</span>
          </div>
        </div>
      </div>

      {/* Grid: Community Distribution + Posts List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Community Distribution */}
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-3.5">
          <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span>Community Breakdown</span>
          </h4>
          {sentiment.communityDistribution.length === 0 ? (
            <p className="text-xs text-muted-foreground">General India Financial Subreddits</p>
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

        {/* Right Column: Real Recent Posts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <span>Real Community Posts & Debates</span>
            </h4>
            <span className="text-xs text-muted-foreground">Links to original public threads</span>
          </div>

          <div className="space-y-3">
            {sentiment.topPosts.map((p) => {
              const score = scoreTitleSentiment(p.title);
              const tone =
                score.positive && !score.negative
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : score.negative && !score.positive
                  ? "border-rose-500/30 bg-rose-500/5"
                  : "border-border/60 bg-card";

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border transition-all hover:border-primary/40 shadow-sm ${tone} space-y-2`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground font-semibold leading-snug hover:text-primary transition-colors flex-1"
                    >
                      {p.title}
                    </a>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Open thread on Reddit"
                    >
                      <ExternalLink className="size-3.5 shrink-0" />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/30">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-primary">{p.subreddit}</span>
                      <span>{timeAgo(p.createdAt)}</span>
                      <span className="tabular-nums">{p.score} upvotes</span>
                      <span className="tabular-nums">{p.numComments} comments</span>
                    </div>

                    <button
                      onClick={() => handleShare(p.id, p.url)}
                      className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {copiedId === p.id ? "Copied!" : "Share link"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
