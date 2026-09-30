"use client";

import { CompanyRetailSentiment } from "@/lib/reddit-sentiment/types";
import { DiscussionDistribution } from "./discussion-distribution";
import { subredditSymbolDiscussionUrl } from "@/lib/reddit-sentiment/reddit-links";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Building2,
  FileText,
  CreditCard,
  LineChart,
} from "lucide-react";
import Link from "next/link";

interface Props {
  sentiment: CompanyRetailSentiment;
}

export function RetailSentimentEngineView({ sentiment }: Props) {
  const isLowChatter =
    sentiment.dataStatus === "LOW_CHATTER" ||
    sentiment.topRetailDebates.length === 0;

  // Format momentum label and color
  const getMomentumDetails = (mom: string) => {
    switch (mom) {
      case "ACCELERATING_BULLISH":
        return {
          label: "Accelerating Bullish",
          arrow: "↑",
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "MILD_BULLISH":
        return {
          label: "Mild Bullish",
          arrow: "↗",
          badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "SOFTENING_BEARISH":
        return {
          label: "Softening Bearish",
          arrow: "↘",
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      case "BEARISH_CAPITULATION":
        return {
          label: "Bearish Capitulation",
          arrow: "↓",
          badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      default:
        return {
          label: isLowChatter ? "Low Social Buzz" : "Neutral / Consolidation",
          arrow: "→",
          badgeClass: "bg-muted text-muted-foreground border-border/40",
        };
    }
  };

  const mom = getMomentumDetails(sentiment.sentimentMomentum);

  const monitoredSubs = [
    {
      id: "r/IndianStreetBets" as const,
      name: "Indian Street Bets",
      desc: "High-volume momentum, options, and breakout sentiment",
    },
    {
      id: "r/IndiaInvestments" as const,
      name: "India Investments",
      desc: "Fundamental valuations, long-term balance sheet analyses",
    },
    {
      id: "r/IndianStockMarket" as const,
      name: "Indian Stock Market",
      desc: "Retail questions, midcap alerts, and portfolio reviews",
    },
    {
      id: "r/ValueInvesting" as const,
      name: "Value Investing",
      desc: "Global economic moats, margin of safety & DCF discussions",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Card: Symbol, Company, 7D Mentions, Net Sentiment Score */}
      <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {sentiment.symbol}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums">
                {sentiment.sector}
              </span>
              {sentiment.marketCapTier && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  {sentiment.marketCapTier.replace("_", " ")}
                </span>
              )}
              {isLowChatter ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Low Social Volume
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Active Social Chatter
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sentiment.companyName} &bull; Upstox NSE Verified Listed Instrument
            </p>
          </div>

          {/* Mentions & Momentum Pill */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">
                7D Mention Volume
              </span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-base font-bold text-foreground tabular-nums">
                  {isLowChatter
                    ? "< 10 (Dormant)"
                    : sentiment.totalMentions7D.toLocaleString()}
                </span>
                {!isLowChatter && (
                  <span className="text-xs font-bold text-emerald-400 tabular-nums">
                    +{sentiment.mentionChangePct7D}%
                  </span>
                )}
              </div>
            </div>

            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${mom.badgeClass}`}
            >
              <span className="text-sm font-bold">{mom.arrow}</span>
              <span className="text-xs font-semibold">{mom.label}</span>
            </div>
          </div>
        </div>

        {/* 2. Sentiment Breakdown Bar or Low Chatter Notice */}
        {isLowChatter ? (
          <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Insufficient Retail Volume for Statistical Polarity Modeling</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {sentiment.statusNotice ||
                `Minimal organic retail discussion detected on r/IndianStreetBets, r/IndiaInvestments, and r/IndianStockMarket over the past 30 days for ${sentiment.companyName} (${sentiment.symbol}). Retail social buzz disproportionately clusters around high-momentum mid/small caps, PSU infrastructure, and headline consumer internet plays. Below are direct live deep-search links and institutional research radars.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  Positive:{" "}
                  <strong className="tabular-nums">
                    {sentiment.positivePct}%
                  </strong>
                </span>
                <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                  Negative:{" "}
                  <strong className="tabular-nums">
                    {sentiment.negativePct}%
                  </strong>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground inline-block" />
                  Neutral:{" "}
                  <strong className="tabular-nums">
                    {sentiment.neutralPct}%
                  </strong>
                </span>
              </div>

              <span className="text-xs text-muted-foreground tabular-nums">
                Net Sentiment Score:{" "}
                <strong
                  className={
                    sentiment.netSentimentScore > 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {sentiment.netSentimentScore > 0
                    ? `+${sentiment.netSentimentScore}`
                    : sentiment.netSentimentScore}
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
        )}

        {/* 3. Most Discussed Topics / Clustered Themes */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            Focus Dimensions:
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

      {/* 4. Main Section: Debates or Low-Chatter Deep Discovery */}
      {isLowChatter ? (
        <div className="space-y-6">
          {/* Deep-Search Live Reddit Matrix */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Live Community Deep-Search Radar</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Query {sentiment.symbol} live across India&apos;s top financial Reddit communities to inspect recent comments or past discussions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {monitoredSubs.map((sub) => {
                const searchUrl = subredditSymbolDiscussionUrl(
                  sub.id,
                  sentiment.symbol,
                  { companyName: sentiment.companyName }
                );
                return (
                  <a
                    key={sub.id}
                    href={searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary group-hover:underline">
                          {sub.id}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {sub.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {sub.desc}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Cross-Platform Market Intelligence Shortcuts */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <LineChart className="w-4 h-4 text-primary" />
                <span>Alternative Intelligence for {sentiment.symbol}</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Because {sentiment.symbol} exhibits low retail speculative chatter, analyze institutional consensus, debt safety, and live market depth:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                href={`/research?symbol=${sentiment.symbol}`}
                className="p-4 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/50 transition-all space-y-1.5 block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Broker Research
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Access institutional broker consensus, analyst target prices, and valuation models.
                </p>
              </Link>

              <Link
                href={`/intelligence/credit?search=${sentiment.symbol}`}
                className="p-4 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/50 transition-all space-y-1.5 block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    Credit & Solvency Radar
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Surveil CRISIL, ICRA, and CARE debt rating rationales and credit migration risks.
                </p>
              </Link>

              <Link
                href="/markets/india"
                className="p-4 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/50 transition-all space-y-1.5 block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Upstox Live Quotes
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Inspect live NSE level-2 order book depth, bid-ask spreads, and intraday volume.
                </p>
              </Link>
            </div>
          </div>
        </div>
      ) : (
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
                      href={subredditSymbolDiscussionUrl(
                        d.subreddit,
                        sentiment.symbol,
                        {
                          companyName: sentiment.companyName,
                          topic: d.topic,
                        }
                      )}
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
                    <strong className="text-foreground mr-1">
                      Community Consensus:
                    </strong>
                    {d.consensusVerdict}
                  </div>

                  {/* Real Verbatim Comment Snippet */}
                  <div className="text-xs italic bg-primary/5 p-2.5 rounded-lg border border-primary/10 text-foreground/80">
                    <span className="text-primary font-semibold mr-1.5 not-italic">
                      Top Upvoted Excerpt:
                    </span>
                    &ldquo;{d.sampleCommentSnippet}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
