"use client";

import { useState } from "react";
import { RetailInvestorProblemInsight, InvestorProblemCategory } from "@/lib/reddit-sentiment/types";
import { subredditSearchUrl } from "@/lib/reddit-sentiment/reddit-links";
import {
  HelpCircle,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Search,
  FileSpreadsheet,
  Calculator,
  MessageSquare,
  ThumbsUp,
  Compass,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Props {
  problems: RetailInvestorProblemInsight[];
}

export function InvestorProblemsRadarView({ problems }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const categories = [
    { id: "ALL", label: "All Surfaced Problems" },
    { id: "RESEARCH", label: "Research & Concalls" },
    { id: "PORTFOLIO_TRACKING", label: "Portfolio Tracking" },
    { id: "TAXES", label: "Taxes & Budget 2024" },
    { id: "FINDING_INFO", label: "Information Discovery" },
  ];

  const filtered = activeCategory === "ALL"
    ? problems
    : problems.filter((p) => p.category === activeCategory);

  const getCategoryIcon = (cat: InvestorProblemCategory) => {
    switch (cat) {
      case "RESEARCH":
        return <Search className="w-4 h-4 text-sky-400" />;
      case "PORTFOLIO_TRACKING":
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      case "TAXES":
        return <Calculator className="w-4 h-4 text-amber-400" />;
      case "FINDING_INFO":
        return <Compass className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Unconventional Alternative Data Explainer */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/60 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Reddit Investor Problems Radar
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Surfacing structural pain points that conventional financial terminals (Bloomberg, Refinitiv, Screener) overlook.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Real-Time Community Demand Pulse
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Financial datasets routinely aggregate stock prices and audited balance sheets, but they fail to capture the friction points investors face daily: decoding management concalls, calculating post-Budget 2024 capital gains taxes, tracking multi-broker holdings without privacy leakage, and discovering silent debt downgrades.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              activeCategory === c.id
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Problem Cards */}
      <div className="grid grid-cols-1 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-all shadow-sm space-y-4"
          >
            {/* Headline Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted/40">
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                    {item.categoryLabel}
                  </span>
                  <h4 className="text-base font-semibold text-foreground leading-tight">
                    {item.headline}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 tabular-nums">
                  +{item.monthlyMentionGrowthPct}% queries/mo
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-foreground/90 leading-relaxed">
              {item.problemDescription}
            </p>

            {/* Conventional Dataset Blindspot */}
            <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs text-muted-foreground space-y-1">
              <strong className="text-rose-400 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Conventional Financial Dataset Blindspot:
              </strong>
              <p className="leading-relaxed">
                {item.conventionalDatasetBlindspot}
              </p>
            </div>

            {/* Real Upvoted Reddit Community Queries */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Upvoted Community Queries & Discussions:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {item.sampleCommunityQueries.map((q, idx) => {
                  const threadSearch = subredditSearchUrl(q.subreddit, q.queryTitle, { time: "year" });
                  return (
                  <a
                    key={idx}
                    href={threadSearch}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-2 text-xs block hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-primary inline-flex items-center gap-1">
                        {q.subreddit}
                        <ExternalLink className="w-3 h-3 opacity-70" aria-hidden />
                      </span>
                      <span className="flex items-center gap-1 tabular-nums">
                        <ThumbsUp className="w-3 h-3 text-emerald-400" />
                        {q.upvotes} upvotes • {q.commentsCount} comments
                      </span>
                    </div>

                    <h5 className="font-semibold text-foreground leading-snug">
                      &ldquo;{q.queryTitle}&rdquo;
                    </h5>

                    <p className="text-muted-foreground italic leading-relaxed">
                      &ldquo;{q.quoteExcerpt}&rdquo;
                    </p>
                  </a>
                  );
                })}
              </div>
            </div>

            {/* MI Direct Solution Bridge */}
            <div className="pt-3 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-muted-foreground">How Market Intelligence solves this: </span>
                <span className="text-foreground/90 font-medium">{item.miSolutionFeature.howItSolves}</span>
              </div>

              <Link
                href={item.miSolutionFeature.href}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 shadow-sm"
              >
                <span>{item.miSolutionFeature.featureTitle}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
