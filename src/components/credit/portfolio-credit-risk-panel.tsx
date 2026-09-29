"use client";

import { useMemo } from "react";
import type { PositionRow } from "@/lib/my-portfolio/types";
import { assessPortfolioCreditRisk } from "@/lib/credit/database";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Info,
  Building2,
} from "lucide-react";
import Link from "next/link";
import {
  CREDIT_RISK_PANEL_SOURCES,
  creditEventVerificationLink,
  nseCorporateFilingsUrl,
} from "@/lib/intelligence/verification-links";
import {
  IntelligenceSourceStrip,
  VerifyAtSourceLink,
} from "@/components/ui/verify-at-source-link";

interface PortfolioCreditRiskPanelProps {
  positions: PositionRow[];
}

export function PortfolioCreditRiskPanel({ positions }: PortfolioCreditRiskPanelProps) {
  const assessment = useMemo(() => {
    return assessPortfolioCreditRisk(positions);
  }, [positions]);

  const getScoreColor = (score: number) => {
    if (score < 40) return "text-red-600 dark:text-red-400";
    if (score < 65) return "text-amber-600 dark:text-amber-400";
    if (score < 80) return "text-cyan-600 dark:text-cyan-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "HIGH_CREDIT_DISTRESS":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-red-500" />
            Credit Distress Hazard
          </span>
        );
      case "WATCH_EXPOSURE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Watch List Exposure
          </span>
        );
      case "INVESTMENT_GRADE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            Investment Grade
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            AAA Prudent
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span>Credit & Debt Rating Risk Radar</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Credit agency upgrades, downgrades, default risk, and liquidity health across your held positions
          </p>
        </div>

        <Link
          href="/intelligence/credit"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>Open Credit Intelligence Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <IntelligenceSourceStrip sources={CREDIT_RISK_PANEL_SOURCES} />

      {/* Credit Risk Score & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Credit Health</span>
            {getGradeBadge(assessment.creditHealthGrade)}
          </div>
          <div className={`text-2xl font-black tabular-nums mt-1 ${getScoreColor(assessment.portfolioCreditHealthScore)}`}>
            {assessment.portfolioCreditHealthScore} / 100
          </div>
          <div className="text-[11px] text-muted-foreground">
            {assessment.holdingsWithDowngradeCount > 0
              ? `${assessment.holdingsWithDowngradeCount} downgrade / watch alert`
              : "Zero rating downgrades"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Stressed Debt Exposure</span>
          <div className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {assessment.capitalInDowngradedDebtCr > 0 ? `₹${assessment.capitalInDowngradedDebtCr} Cr` : "₹0 (Clean)"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Holdings facing downgrades or credit watch
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Upgraded Capital Support</span>
          <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {assessment.capitalInUpgradedDebtCr > 0 ? `+₹${assessment.capitalInUpgradedDebtCr} Cr` : "None"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Holdings with recent rating upgrades
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Liquidity Warnings</span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-1">
            {assessment.holdingsWithLiquidityConcernsCount} Holdings
          </div>
          <div className="text-[11px] text-muted-foreground">
            Stretched cash conversion or refinancing cliff
          </div>
        </div>
      </div>

      {/* Advisory Summary Banner */}
      <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Credit Advisory Note: </span>
          <span className="text-muted-foreground leading-relaxed">{assessment.portfolioCreditSummary}</span>
        </div>
      </div>

      {/* Flagged Credit Holdings List */}
      {assessment.flaggedHoldings.length > 0 ? (
        <div className="space-y-2.5 pt-1">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Holdings with Active Agency Ratings & Credit Actions ({assessment.flaggedHoldings.length})
          </div>

          <div className="space-y-2">
            {assessment.flaggedHoldings.map((h) => {
              const isCritical = h.actionSeverity === "CRITICAL";
              const isPositive = h.actionSeverity === "POSITIVE";

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
                        Rating: {h.creditRating} ({h.agency})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCritical && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                          <AlertOctagon className="w-3 h-3 text-red-500" />
                          Default / Severe Hazard
                        </span>
                      )}
                      {isPositive && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          <TrendingUp className="w-3 h-3" />
                          Rating Upgrade Tailwind
                        </span>
                      )}
                      {!isCritical && !isPositive && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          Downgrade / Watch
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {h.advisoryNote}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-border/30">
                    <VerifyAtSourceLink
                      {...creditEventVerificationLink({
                        symbol: h.symbol,
                        agency: h.agency,
                        sourceUrl: h.sourceUrl,
                        actionDate: h.actionDate,
                      })}
                    />
                    <VerifyAtSourceLink
                      href={nseCorporateFilingsUrl(h.symbol)}
                      label={`NSE filings · ${h.symbol}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground">
          No immediate credit rating downgrades or debt distress notices recorded for your current portfolio holdings.
        </div>
      )}
    </div>
  );
}
