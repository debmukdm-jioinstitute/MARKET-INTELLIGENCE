"use client";

import { useMemo } from "react";
import type { PositionRow } from "@/lib/my-portfolio/types";
import { assessPortfolioPromoterRisk } from "@/lib/promoters/risk-engine";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Info,
} from "lucide-react";
import Link from "next/link";

interface PortfolioPromoterRiskPanelProps {
  positions: PositionRow[];
}

export function PortfolioPromoterRiskPanel({ positions }: PortfolioPromoterRiskPanelProps) {
  const assessment = useMemo(() => {
    return assessPortfolioPromoterRisk(positions);
  }, [positions]);

  const getScoreColor = (score: number) => {
    if (score >= 65) return "text-red-600 dark:text-red-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    if (score >= 25) return "text-cyan-600 dark:text-cyan-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "HIGH_PLEDGE_RISK":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1">
            <Lock className="w-3 h-3 text-red-500" />
            High Pledge Hazard
          </span>
        );
      case "ELEVATED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Elevated Selling
          </span>
        );
      case "MODERATE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            Moderate
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Clean Governance
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span>Promoter & Governance Risk Engine</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time pledge surveillance, insider selling pressure, and promoter buying support for your held positions
          </p>
        </div>

        <Link
          href="/intelligence/promoters"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>Open Promoter Tracker Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Risk Score & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Governance Score</span>
            {getGradeBadge(assessment.governanceRiskGrade)}
          </div>
          <div className={`text-2xl font-black tabular-nums mt-1 ${getScoreColor(assessment.overallGovernanceRiskScore)}`}>
            {assessment.overallGovernanceRiskScore} / 100
          </div>
          <div className="text-[11px] text-muted-foreground">
            {assessment.criticalAlertsCount > 0
              ? `${assessment.criticalAlertsCount} critical pledge alert`
              : "0 high pledge warnings"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Pledge Exposure</span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-1">
            {assessment.pledgeRiskExposureCr > 0 ? `₹${assessment.pledgeRiskExposureCr} Cr` : "₹0 (Clean)"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Holdings with &gt; 20% promoter pledge
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Promoter Selling Pressure</span>
          <div className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {assessment.promoterSellingExposureCr > 0 ? `₹${assessment.promoterSellingExposureCr} Cr` : "None"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Holdings with active insider / OFS sales
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Promoter Buying Support</span>
          <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {assessment.promoterBuyingSupportCr > 0 ? `+₹${assessment.promoterBuyingSupportCr} Cr` : "None"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Holdings backed by open-market buying
          </div>
        </div>
      </div>

      {/* Advisory Summary Banner */}
      <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Risk Advisory Note: </span>
          <span className="text-muted-foreground leading-relaxed">{assessment.recommendationSummary}</span>
        </div>
      </div>

      {/* Flagged Holdings List */}
      {assessment.flaggedHoldings.length > 0 ? (
        <div className="space-y-2.5 pt-1">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Holdings with Recent Promoter / Pledge Activity ({assessment.flaggedHoldings.length})
          </div>

          <div className="space-y-2">
            {assessment.flaggedHoldings.map((h) => {
              const isCritical = h.riskSeverity === "CRITICAL";
              const isPositive = h.riskSeverity === "POSITIVE";

              return (
                <div
                  key={h.symbol}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    isCritical
                      ? "bg-red-500/5 border-red-500/20"
                      : isPositive
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-muted/40 border-border/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{h.symbol}</span>
                      <span className="text-xs text-muted-foreground">({h.companyName})</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                        {h.portfolioWeightPct}% of Portfolio
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCritical && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3 text-red-500" />
                          Critical Pledge Hazard
                        </span>
                      )}
                      {isPositive && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          <TrendingUp className="w-3 h-3" />
                          Promoter Buying Support
                        </span>
                      )}
                      {!isCritical && !isPositive && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          <TrendingDown className="w-3 h-3" />
                          Insider Selling
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {h.advisoryNote}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground">
          No immediate promoter encumbrances or adverse insider transactions detected in your current holdings.
        </div>
      )}
    </div>
  );
}
