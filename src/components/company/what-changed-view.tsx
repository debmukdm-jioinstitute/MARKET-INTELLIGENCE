"use client";

import { WhatChangedSummary, WhatChangedDimension } from "@/lib/company-intelligence/types";
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle, Compass, CheckCircle2 } from "lucide-react";

interface Props {
  whatChanged: WhatChangedSummary;
  companyName: string;
  symbol: string;
}

export function WhatChangedView({ whatChanged, companyName, symbol }: Props) {
  const getVerdictBadge = (verdict: WhatChangedDimension["verdict"]) => {
    switch (verdict) {
      case "UPGRADE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-3 h-3" />
            Upgraded
          </span>
        );
      case "DOWNGRADE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-3 h-3" />
            Downgraded / Caution
          </span>
        );
      case "PIVOT":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Compass className="w-3 h-3" />
            Strategic Pivot
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
            <Minus className="w-3 h-3" />
            Maintained
          </span>
        );
    }
  };

  const getNetDirectionBadge = (dir: WhatChangedSummary["netDirection"]) => {
    switch (dir) {
      case "POSITIVE_INFLECTION":
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Positive Strategic Inflection
          </span>
        );
      case "CAUTIONARY_HEADWINDS":
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Cautionary Headwinds Emerging
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Neutral Steady Execution
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Synthesis Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-card via-card to-primary/5 border border-primary/20 shadow-sm relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">
              AI-Synthesized Delta Analysis
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              Comparing {whatChanged.period}
            </span>
          </div>

          <div>{getNetDirectionBadge(whatChanged.netDirection)}</div>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed font-normal">
          {whatChanged.executiveSynthesis}
        </p>
      </div>

      {/* Dimensional Changes Comparison Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center justify-between">
          <span>Dimensional Variance & Management Shifts</span>
          <span className="text-xs font-normal text-muted-foreground">
            {whatChanged.dimensions.length} core operational pillars analyzed
          </span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {whatChanged.dimensions.map((dim, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {dim.dimension}
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    AI Confidence: <strong className="text-foreground">{dim.confidenceScore}%</strong>
                  </span>
                  {getVerdictBadge(dim.verdict)}
                </div>
              </div>

              {/* Two-Column Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-xs">
                  <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Prior Reporting Quarter
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {dim.priorQuarter}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                  <span className="block text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">
                    Current Disclosure / Latest Quarter
                  </span>
                  <p className="text-foreground leading-relaxed font-normal">
                    {dim.currentQuarter}
                  </p>
                </div>
              </div>

              {/* Synthesized Change Narrative */}
              <div className="text-xs bg-card/60 p-2.5 rounded-lg border border-border/40 text-foreground/80 flex items-start gap-2">
                <span className="font-semibold text-primary shrink-0">Key Shift:</span>
                <span>{dim.changeNarrative}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catalysts to Watch & Key Risk Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Catalysts */}
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wide">
            <CheckCircle2 className="w-4 h-4" />
            <span>Inflection Catalysts to Watch</span>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {whatChanged.catalystsToWatch.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">•</span>
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risk Alerts */}
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4" />
            <span>Key Risk Alerts & Vulnerabilities</span>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {whatChanged.keyRiskAlerts.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">•</span>
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
