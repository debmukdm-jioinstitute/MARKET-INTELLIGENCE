"use client";

import { useState } from "react";
import { ConcallQuarterReport, HistoricalToneQuarter, ManagementTone } from "@/lib/company-intelligence/types";
import { AiConcallToneSparkline } from "@/components/company/ai-concall-tone-sparkline";
import {
  Headphones,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Factory,
  Users,
  ShieldAlert,
  Flame,
  Globe2,
  CheckCircle,
  HelpCircle,
  Quote,
  Clock,
  Mic,
} from "lucide-react";

interface Props {
  concall: ConcallQuarterReport;
  historicalTone: HistoricalToneQuarter[];
  companyName: string;
  symbol: string;
}

export function ConcallIntelligenceView({ concall, historicalTone, companyName, symbol }: Props) {
  const [selectedQAId, setSelectedQAId] = useState<string>(concall.analystQA[0]?.id || "");

  const getToneBadge = (tone: ManagementTone) => {
    switch (tone) {
      case "BULLISH":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Bullish (80-100)
          </span>
        );
      case "OPTIMISTIC":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
            Optimistic (65-79)
          </span>
        );
      case "NEUTRAL":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Neutral (50-64)
          </span>
        );
      case "CAUTIOUS":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            Cautious (35-49)
          </span>
        );
      case "DEFENSIVE":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Defensive (0-34)
          </span>
        );
    }
  };

  const getQAToneBadge = (tone: string) => {
    switch (tone) {
      case "CONFIDENT":
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Direct & Confident
          </span>
        );
      case "GUARDED":
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Guarded / Evasive
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Conciliatory
          </span>
        );
    }
  };

  const selectedQA = concall.analystQA.find((q) => q.id === selectedQAId) || concall.analystQA[0];

  return (
    <div className="space-y-8">
      {/* 1. Management Tone Tracker (Historical Trajectory) */}
      <div className="p-5 rounded-xl bg-card border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Management Tone Tracker — Historical Trajectory</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Longitudinal sentiment drift across quarterly earnings calls, measuring management confidence inflection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Latest Stance:</span>
            {getToneBadge(concall.dimensions.managementConfidence.stance)}
          </div>
        </div>

        {/* Trajectory Step Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {historicalTone.map((h, i) => {
            const isLatest = i === historicalTone.length - 1;
            return (
              <div
                key={h.quarter}
                className={`p-3 rounded-xl border transition-all ${
                  isLatest
                    ? "bg-primary/5 border-primary/40 shadow-sm"
                    : "bg-muted/20 border-border/40 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-foreground">{h.quarter}</span>
                  <span className="tabular-nums text-[11px] text-muted-foreground">{h.score}/100</span>
                </div>

                <div className="mb-2">
                  <span
                    className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      h.tone === "BULLISH"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : h.tone === "OPTIMISTIC"
                        ? "bg-teal-500/10 text-teal-400"
                        : h.tone === "NEUTRAL"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {h.tone}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                  {h.keyTheme}
                </p>

                <div className="mt-2.5 pt-1.5 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Rev: {h.revenueBeatMiss}</span>
                  <span>Margin: {h.marginBeatMiss}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AiConcallToneSparkline symbol={symbol} />

      {/* 2. Current Call Executive Banner */}
      <div className="p-5 rounded-xl bg-card border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {concall.quarter} Earnings Conference Call Breakdown
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                  {concall.date}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>{concall.participants.map((p) => `${p.name} (${p.designation})`).join(" • ")}</span>
                {concall.audioDurationMin && (
                  <span className="flex items-center gap-1 tabular-nums text-foreground/80">
                    <Clock className="w-3 h-3" />
                    {concall.audioDurationMin} min call
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Management Confidence</span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {concall.dimensions.managementConfidence.score}
                <span className="text-xs font-normal text-muted-foreground">/100</span>
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-xs text-foreground/90 leading-relaxed">
          <strong className="text-primary font-semibold mr-1.5">Executive Verdict:</strong>
          {concall.headlineVerdict}
        </div>
      </div>

      {/* 3. Extracted Concall Operational Pillars (Grid) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center justify-between">
          <span>Extracted Concall Dimensions</span>
          <span className="text-xs font-normal text-muted-foreground">
            Machine-extracted from official transcript & disclosures
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Revenue Outlook */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Revenue Outlook
              </span>
              <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                {concall.dimensions.revenueOutlook.stance}
              </span>
            </div>
            <div className="text-xs font-semibold text-primary tabular-nums">
              Target: {concall.dimensions.revenueOutlook.targetGrowthPct}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {concall.dimensions.revenueOutlook.commentary}
            </p>
          </div>

          {/* Margin Outlook */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Margin Trajectory
              </span>
              <span className="text-[11px] font-medium text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10">
                {concall.dimensions.marginOutlook.stance}
              </span>
            </div>
            <div className="text-xs font-semibold text-primary tabular-nums">
              Guidance: {concall.dimensions.marginOutlook.targetMarginPct}
            </div>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <div>
                <span className="text-emerald-400 font-medium">Tailwinds:</span>{" "}
                {concall.dimensions.marginOutlook.tailwinds.join(", ")}
              </div>
              <div>
                <span className="text-rose-400 font-medium">Headwinds:</span>{" "}
                {concall.dimensions.marginOutlook.headwinds.join(", ")}
              </div>
            </div>
          </div>

          {/* Capex Outlay */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Capex & Balance Sheet
              </span>
              <span className="text-xs font-medium text-foreground tabular-nums">
                ₹{concall.dimensions.capex.outlayInrCr.toLocaleString()} Cr
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {concall.dimensions.capex.allocationFocus}
            </p>
            <div className="text-[11px] text-emerald-400 bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10">
              {concall.dimensions.capex.debtImpact}
            </div>
          </div>

          {/* Demand Environment */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Demand Environment
              </span>
              <span className="text-[11px] font-medium text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10">
                {concall.dimensions.demand.environment}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {concall.dimensions.demand.details}
            </p>
          </div>

          {/* Pricing Power & Discounts */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-purple-400" />
                Pricing Power
              </span>
              <span className="text-[11px] font-medium text-purple-400 px-2 py-0.5 rounded bg-purple-500/10">
                {concall.dimensions.pricing.pricingPower}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {concall.dimensions.pricing.discountsCommentary}
            </p>
          </div>

          {/* Competition & Market Share */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Competition & Share
              </span>
              <span className="text-[11px] font-medium text-rose-400 px-2 py-0.5 rounded bg-rose-500/10">
                {concall.dimensions.competition.intensity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {concall.dimensions.competition.marketShareShift}
            </p>
          </div>

          {/* Commodity & Input Costs */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                Commodity Costs
              </span>
              <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                {concall.dimensions.commodityCosts.trend}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Key components: {concall.dimensions.commodityCosts.impactedSegments.join(", ")}
            </p>
          </div>

          {/* Hiring & Wages */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                Hiring & Inflation
              </span>
              <span className="text-[11px] font-medium text-sky-400 px-2 py-0.5 rounded bg-sky-500/10">
                {concall.dimensions.hiring.headcountTrend}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Wage inflation increment: <strong className="text-foreground">{concall.dimensions.hiring.wageInflationPct}</strong>
            </p>
          </div>

          {/* Guidance Status */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                Guidance Status
              </span>
              <span className="text-[11px] font-medium text-teal-400 px-2 py-0.5 rounded bg-teal-500/10">
                {concall.dimensions.guidanceChanges.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {concall.dimensions.guidanceChanges.details}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Analyst Q&A Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center justify-between">
          <span>Hard-Hitting Analyst Q&A Breakdown</span>
          <span className="text-xs font-normal text-muted-foreground">
            {concall.analystQA.length} institutional questions extracted
          </span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Question List Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            {concall.analystQA.map((qa) => {
              const active = qa.id === selectedQAId;
              return (
                <button
                  key={qa.id}
                  onClick={() => setSelectedQAId(qa.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    active
                      ? "bg-card border-primary/50 shadow-sm"
                      : "bg-muted/15 border-border/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-foreground">{qa.analystName}</span>
                    <span className="text-[11px] text-muted-foreground">{qa.firm}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {qa.question}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    {getQAToneBadge(qa.tone)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Question & Answer Detail */}
          {selectedQA && (
            <div className="lg:col-span-2 p-5 rounded-xl bg-card border border-border/60 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{selectedQA.analystName}</h4>
                    <span className="text-xs text-muted-foreground">({selectedQA.firm})</span>
                  </div>
                  <span className="text-xs text-primary font-medium mt-0.5 block">
                    Answered by: {selectedQA.managementSpeaker}
                  </span>
                </div>
                <div>{getQAToneBadge(selectedQA.tone)}</div>
              </div>

              {/* Question */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Analyst Question
                </span>
                <p className="text-xs text-foreground font-medium bg-muted/30 p-3 rounded-lg border border-border/40 leading-relaxed">
                  "{selectedQA.question}"
                </p>
              </div>

              {/* Synthesis Answer */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Management Synthesis
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedQA.answerSummary}
                </p>
              </div>

              {/* Verbatim Excerpt */}
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Quote className="w-3.5 h-3.5" />
                  <span>Verbatim Transcript Excerpt</span>
                </div>
                <p className="text-xs text-foreground/90 italic leading-relaxed">
                  "{selectedQA.verbatimExcerpt}"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
