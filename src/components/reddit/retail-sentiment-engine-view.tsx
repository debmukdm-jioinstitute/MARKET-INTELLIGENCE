"use client";

import { CompanyRetailSentiment, SentimentMomentum } from "@/lib/reddit-sentiment/types";
import { subredditSymbolDiscussionUrl } from "@/lib/reddit-sentiment/reddit-links";
import { DiscussionDistribution } from "@/components/reddit/discussion-distribution";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

interface Props {
  sentiment: CompanyRetailSentiment;
}

export function RetailSentimentEngineView({ sentiment }: Props) {
  const getMomentumDisplay = (momentum: SentimentMomentum) => {
    switch (momentum) {
      case "ACCELERATING_BULLISH":
        return {
          icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
          arrow: "↑",
          label: "Accelerating Bullish",
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "MILD_BULLISH":
        return {
          icon: <ArrowUpRight className="w-4 h-4 text-teal-400" />,
          arrow: "↗",
          label: "Mild Bullish",
          badgeClass: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        };
      case "SOFTENING_BEARISH":
        return {
          icon: <TrendingDown className="w-4 h-4 text-orange-400" />,
          arrow: "↘",
          label: "Softening / Bearish",
          badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        };
      case "BEARISH_CAPITULATION":
        return {
          icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
          arrow: "↓",
          label: "Bearish Capitulation",
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      default:
        return {
          icon: <Minus className="w-4 h-4 text-amber-400" />,
          arrow: "→",
          label: "Neutral / Rangebound",
          badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
    }
  };

  const mom = getMomentumDisplay(sentiment.sentimentMomentum);

  return (
    <div className="space-y-6">
      {/* 1. Main Headline Sentiment Card (Direct user format) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {sentiment.symbol}
              </span>
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {sentiment.companyName}
              </h3>
              <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                {sentiment.sector}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Alternative retail sentiment aggregated across Reddit discussions, daily comment volume, and sentiment momentum.
            </p>
          </div>

          {/* Mentions & Momentum Pill */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">7D Mention Volume</span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-base font-bold text-foreground tabular-nums">
                  {sentiment.totalMentions7D.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                  +{sentiment.mentionChangePct7D}%
                </span>
              </div>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${mom.badgeClass}`}>
              <span className="text-sm font-bold">{mom.arrow}</span>
              <span className="text-xs font-semibold">{mom.label}</span>
            </div>
          </div>
        </div>

        {/* 2. Sentiment Breakdown Bar: Positive, Negative, Neutral */}
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
              Net Sentiment Score: <strong className={sentiment.netSentimentScore > 0 ? "text-emerald-400" : "text-rose-400"}>
                {sentiment.netSentimentScore > 0 ? `+${sentiment.netSentimentScore}` : sentiment.netSentimentScore}
              </strong>
            </span>
          </div>

          {/* Tri-color Progress Bar */}
          <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden flex">
            <div
              style={{ width: `${sentiment.positivePct}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`Positive: ${sentiment.positivePct}%`}
            />
            <div
              style={{ width: `${sentiment.neutralPct}%` }}
              className="bg-amber-500/70 h-full transition-all duration-500"
              title={`Neutral: ${sentiment.neutralPct}%`}
            />
            <div
              style={{ width: `${sentiment.negativePct}%` }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`Negative: ${sentiment.negativePct}%`}
            />
          </div>
        </div>

        {/* 3. Most Discussed Topics / Clustered Themes */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            Most Discussed Topics:
          </span>
          {sentiment.mostDiscussedTopics.map((topic, i) => (
            <span
              key={i}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-card border border-border/80 text-foreground hover:border-primary/40 transition-colors shadow-2xs"
            >
              • {topic}
            </span>
          ))}
        </div>
      </div>

      {/* 4. Two-Column Layout: Community Distribution & Bull/Bear Debates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DiscussionDistribution sentiment={sentiment} />

        {/* Right: Retail Bull vs Bear Community Debates */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Real Retail Bull vs Bear Theses</span>
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Synthesized from active community threads
            </span>
          </h4>

          <div className="space-y-4">
            {sentiment.topRetailDebates.map((d, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-2">
                  <h5 className="text-sm font-semibold text-foreground">
                    {d.topic}
                  </h5>
                  <a
                    href={subredditSymbolDiscussionUrl(d.subreddit, sentiment.symbol, {
                      companyName: sentiment.companyName,
                      topic: d.topic,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded inline-flex items-center gap-1 hover:underline"
                  >
                    Source: {d.subreddit}
                    <ExternalLink className="w-3 h-3" aria-hidden />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Bull Thesis */}
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-wide">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Retail Bull Argument
                    </span>
                    <p className="text-foreground/90 leading-relaxed font-normal">
                      {d.bullThesis}
                    </p>
                  </div>

                  {/* Bear Thesis */}
                  <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1 uppercase tracking-wide">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Retail Bear Argument
                    </span>
                    <p className="text-foreground/90 leading-relaxed font-normal">
                      {d.bearThesis}
                    </p>
                  </div>
                </div>

                {/* Consensus Verdict */}
                <div className="text-xs bg-muted/30 p-2.5 rounded-lg border border-border/40 text-muted-foreground">
                  <strong className="text-foreground mr-1">Community Consensus:</strong>
                  {d.consensusVerdict}
                </div>

                {/* Real Verbatim Comment Snippet */}
                <div className="text-xs italic bg-primary/5 p-2.5 rounded-lg border border-primary/10 text-foreground/80">
                  <span className="text-primary font-semibold mr-1.5 not-italic">Top Upvoted Excerpt:</span>
                  "{d.sampleCommentSnippet}"
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
