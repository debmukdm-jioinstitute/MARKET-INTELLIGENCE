"use client";

import { useState, useMemo } from "react";
import type { MutualFund, OverlapResult } from "@/lib/funds/types";
import { calculateFundOverlap } from "@/lib/funds/analytics";
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  PieChart,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface FundOverlapViewProps {
  allFunds: MutualFund[];
  initialFundAId?: string;
  initialFundBId?: string;
  onSelectFund?: (fundId: string) => void;
}

export function FundOverlapView({
  allFunds,
  initialFundAId,
  initialFundBId,
  onSelectFund,
}: FundOverlapViewProps) {
  const [fundAId, setFundAId] = useState(initialFundAId || allFunds[0]?.id || "");
  const [fundBId, setFundBId] = useState(
    initialFundBId || (allFunds[3]?.id !== fundAId ? allFunds[3]?.id : allFunds[1]?.id) || ""
  );

  const fundA = useMemo(() => allFunds.find((f) => f.id === fundAId) || allFunds[0], [allFunds, fundAId]);
  const fundB = useMemo(() => allFunds.find((f) => f.id === fundBId) || allFunds[1], [allFunds, fundBId]);

  const overlapResult: OverlapResult = useMemo(() => {
    if (!fundA || !fundB) {
      return {
        fundA: { id: "", name: "", shortName: "", category: "", aumCr: 0 },
        fundB: { id: "", name: "", shortName: "", category: "", aumCr: 0 },
        overlapPct: 0,
        commonHoldingsCount: 0,
        fundAUniqueCount: 0,
        fundBUniqueCount: 0,
        commonHoldings: [],
        fundAUniqueHoldings: [],
        fundBUniqueHoldings: [],
        sectorComparison: [],
      };
    }
    return calculateFundOverlap(fundA, fundB);
  }, [fundA, fundB]);

  const getOverlapAssessment = (pct: number) => {
    if (pct < 15) {
      return {
        title: "High Diversification Benefit",
        level: "Low Overlap",
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        icon: CheckCircle2,
        description: "These funds complement each other effectively with minimal duplicate stock exposure. Excellent for a well-diversified core-satellite portfolio.",
      };
    } else if (pct <= 35) {
      return {
        title: "Moderate Portfolio Overlap",
        level: "Moderate Overlap",
        color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
        icon: Info,
        description: "There is some commonality in heavyweight anchor stocks, but distinct sector weights and mid/small cap selections differentiate the two funds.",
      };
    } else {
      return {
        title: "High Redundancy Risk",
        level: "High Overlap",
        color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
        icon: AlertTriangle,
        description: "A substantial portion of capital is allocated to identical underlying securities. Holding both may lead to portfolio bloat and duplicate expense drag without meaningful diversification.",
      };
    }
  };

  const assessment = getOverlapAssessment(overlapResult.overlapPct);
  const AssessmentIcon = assessment.icon;

  return (
    <div className="space-y-6">
      {/* Header & Fund Selectors */}
      <div className="p-6 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-primary/5 backdrop-blur-xl space-y-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <GitCompare className="w-3.5 h-3.5" />
            <span>2-Fund Overlap Analyzer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Portfolio Overlap & Duplicate Risk Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare two mutual funds side-by-side to calculate identical stock holdings, common weight concentration, and sector divergence.
          </p>
        </div>

        {/* Side-by-side Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Fund A Picker */}
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Fund A (Base Scheme)
            </label>
            <select
              value={fundAId}
              onChange={(e) => setFundAId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-muted/60 border border-border/60 rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {allFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.shortName} • {f.category}
                </option>
              ))}
            </select>
            {fundA && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>AUM: <strong className="text-foreground">₹{fundA.aumCr.toLocaleString()} Cr</strong></span>
                <span>Holdings: <strong className="text-foreground">{fundA.holdings.length}</strong></span>
              </div>
            )}
          </div>

          {/* Fund B Picker */}
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Fund B (Comparison Scheme)
            </label>
            <select
              value={fundBId}
              onChange={(e) => setFundBId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-muted/60 border border-border/60 rounded-xl text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {allFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.shortName} • {f.category}
                </option>
              ))}
            </select>
            {fundB && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>AUM: <strong className="text-foreground">₹{fundB.aumCr.toLocaleString()} Cr</strong></span>
                <span>Holdings: <strong className="text-foreground">{fundB.holdings.length}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Overlap Result Callout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 border-t border-border/60">
          {/* Main Overlap Gauge */}
          <div className="p-5 rounded-xl bg-card border border-border/60 flex flex-col justify-center items-center text-center space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Calculated Portfolio Overlap
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-foreground">
              {overlapResult.overlapPct}%
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${assessment.color}`}>
              {assessment.level}
            </span>
          </div>

          {/* Qualitative Assessment */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-card border border-border/60 flex flex-col justify-center space-y-2">
            <div className="flex items-center gap-2">
              <AssessmentIcon className="w-5 h-5 text-primary shrink-0" />
              <h3 className="text-base font-bold text-foreground">
                {assessment.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {assessment.description}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground border-t border-border/30">
              <div>
                Common Stocks: <strong className="text-foreground">{overlapResult.commonHoldingsCount}</strong>
              </div>
              <div>
                Unique to {fundA?.shortName}: <strong className="text-foreground">{overlapResult.fundAUniqueCount}</strong>
              </div>
              <div>
                Unique to {fundB?.shortName}: <strong className="text-foreground">{overlapResult.fundBUniqueCount}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Common Holdings Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm space-y-0">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Common Overlapping Holdings ({overlapResult.commonHoldings.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stocks held simultaneously in both funds, ranked by their contribution to total portfolio overlap
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Overlap Contribution Formula: Σ min(Weight A, Weight B)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/60">
              <tr>
                <th className="px-4 py-3">Security Name</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3 text-right">{fundA?.shortName} Weight (%)</th>
                <th className="px-4 py-3 text-right">{fundB?.shortName} Weight (%)</th>
                <th className="px-4 py-3 text-right">Overlap Weight (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {overlapResult.commonHoldings.map((stock) => (
                <tr key={stock.symbol} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{stock.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={stock.name}>
                        {stock.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground font-medium">{stock.sector}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                    {stock.weightA.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                    {stock.weightB.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-primary">
                    {stock.minWeight.toFixed(2)}%
                  </td>
                </tr>
              ))}

              {overlapResult.commonHoldings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Zero common holdings found between these two schemes. Full portfolio uniqueness!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Weight Divergence */}
      <div className="p-5 rounded-xl border border-border/60 bg-card space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            Sector Exposure Divergence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare how {fundA?.shortName} vs {fundB?.shortName} allocate across key economic sectors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {overlapResult.sectorComparison.slice(0, 8).map((sec) => (
            <div key={sec.sector} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{sec.sector}</span>
                <span className="font-bold tabular-nums text-foreground">
                  Δ {Math.abs(sec.diff)}% difference
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>{fundA?.shortName}:</span>
                  <span className="font-semibold text-foreground tabular-nums">{sec.weightA}%</span>
                </div>
                <div className="flex justify-between">
                  <span>{fundB?.shortName}:</span>
                  <span className="font-semibold text-foreground tabular-nums">{sec.weightB}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unique Holdings Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fund A Unique */}
        <div className="p-5 rounded-xl border border-border/60 bg-card space-y-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground">
              Unique to {fundA?.shortName} ({overlapResult.fundAUniqueCount})
            </h3>
            <p className="text-xs text-muted-foreground">
              Stocks held only in {fundA?.shortName} and not in {fundB?.shortName}
            </p>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {overlapResult.fundAUniqueHoldings.map((h) => (
              <div key={h.symbol} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                <div>
                  <span className="font-bold text-foreground">{h.symbol}</span>
                  <span className="text-[11px] text-muted-foreground ml-1.5">({h.sector})</span>
                </div>
                <span className="font-bold tabular-nums text-foreground">{h.weightPct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fund B Unique */}
        <div className="p-5 rounded-xl border border-border/60 bg-card space-y-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground">
              Unique to {fundB?.shortName} ({overlapResult.fundBUniqueCount})
            </h3>
            <p className="text-xs text-muted-foreground">
              Stocks held only in {fundB?.shortName} and not in {fundA?.shortName}
            </p>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {overlapResult.fundBUniqueHoldings.map((h) => (
              <div key={h.symbol} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                <div>
                  <span className="font-bold text-foreground">{h.symbol}</span>
                  <span className="text-[11px] text-muted-foreground ml-1.5">({h.sector})</span>
                </div>
                <span className="font-bold tabular-nums text-foreground">{h.weightPct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
