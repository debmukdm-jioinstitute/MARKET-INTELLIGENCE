"use client";

import { useState, useMemo } from "react";
import type { PromoterActivityRecord, PromoterActivityType } from "@/lib/promoters/types";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Building,
  UserCheck,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Lock,
  Unlock,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface PromoterTrackerViewProps {
  activities: PromoterActivityRecord[];
  summary: {
    totalTransactions: number;
    totalBuyingValueCr: number;
    totalSellingValueCr: number;
    netFlowCr: number;
    pledgeAlertsCount: number;
    blockDealsValueCr: number;
    bulkDealsValueCr: number;
    netPromoterSentiment: string;
    reportingPeriod: string;
  };
}

export function PromoterTrackerView({ activities, summary }: PromoterTrackerViewProps) {
  const { data: portfolioData } = useMyPortfolio();
  const heldSymbols = useMemo(() => {
    return new Set(portfolioData?.positions?.map((p) => p.symbol.toUpperCase()) ?? []);
  }, [portfolioData?.positions]);

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyMyPortfolio, setOnlyMyPortfolio] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories: { id: string; label: string; badge?: string }[] = [
    { id: "ALL", label: "All Activities" },
    { id: "PROMOTER_BUYING", label: "Promoter Buying" },
    { id: "PROMOTER_SELLING", label: "Promoter Selling" },
    { id: "PLEDGE_INCREASE", label: "Pledge Increase", badge: "RISK" },
    { id: "PLEDGE_DECREASE", label: "Pledge Decrease", badge: "POSITIVE" },
    { id: "INSIDER_BUYING", label: "Insider Buying" },
    { id: "INSIDER_SELLING", label: "Insider Selling" },
    { id: "LARGE_SHAREHOLDER_CHANGE", label: "Large Shareholders" },
    { id: "BLOCK_DEAL", label: "Block Deals" },
    { id: "BULK_DEAL", label: "Bulk Deals" },
  ];

  const sectors = useMemo(() => {
    const s = new Set<string>();
    activities.forEach((a) => s.add(a.sector));
    return ["ALL", ...Array.from(s).sort()];
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedCategory !== "ALL" && act.category !== selectedCategory) return false;
      if (selectedSector !== "ALL" && act.sector !== selectedSector) return false;
      if (onlyMyPortfolio && !heldSymbols.has(act.symbol.toUpperCase())) return false;
      if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase().trim();
        const match =
          act.symbol.toLowerCase().includes(q) ||
          act.companyName.toLowerCase().includes(q) ||
          act.personName.toLowerCase().includes(q) ||
          act.sector.toLowerCase().includes(q) ||
          act.rationale.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activities, selectedCategory, selectedSector, onlyMyPortfolio, heldSymbols, searchTerm]);

  const getCategoryBadge = (category: PromoterActivityType) => {
    switch (category) {
      case "PROMOTER_BUYING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-3 h-3" />
            Promoter Buying
          </span>
        );
      case "PROMOTER_SELLING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-3 h-3" />
            Promoter Selling
          </span>
        );
      case "PLEDGE_INCREASE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600/10 text-red-600 dark:text-red-400 border border-red-600/20">
            <Lock className="w-3 h-3 text-red-500" />
            Pledge Increase
          </span>
        );
      case "PLEDGE_DECREASE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Unlock className="w-3 h-3 text-emerald-500" />
            Pledge Released
          </span>
        );
      case "INSIDER_BUYING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <UserCheck className="w-3 h-3" />
            Insider Buying
          </span>
        );
      case "INSIDER_SELLING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <UserCheck className="w-3 h-3" />
            Insider Selling
          </span>
        );
      case "LARGE_SHAREHOLDER_CHANGE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Building className="w-3 h-3" />
            Large Shareholder
          </span>
        );
      case "BLOCK_DEAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Layers className="w-3 h-3" />
            Block Deal
          </span>
        );
      case "BULK_DEAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Zap className="w-3 h-3" />
            Bulk Deal
          </span>
        );
      default:
        return null;
    }
  };

  const getRiskImpactBadge = (impact: PromoterActivityRecord["riskImpact"]) => {
    switch (impact) {
      case "HIGH_GOVERNANCE_RISK":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            High Governance Risk
          </span>
        );
      case "BULLISH_CONVICTION":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            Bullish Conviction
          </span>
        );
      case "POSITIVE_DELEVERAGING":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3" />
            Deleveraging
          </span>
        );
      case "BEARISH_DILUTION":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
            <TrendingDown className="w-3 h-3" />
            Supply Dilution
          </span>
        );
      case "NEUTRAL_LIQUIDITY":
        return (
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Liquidity / Normal
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="p-6 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-primary/5 backdrop-blur-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Building className="w-3.5 h-3.5" />
              <span>SEBI SAST & PIT Regulatory Surveillance</span>
              <span className="text-muted-foreground">•</span>
              <span>{summary.reportingPeriod}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Promoter & Insider Activity Tracker
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time intelligence tracking promoter buying, secondary market selling, pledge creation & release,
              director transactions, marquee investor entries, and NSE/BSE bulk and block deals — linked directly into your portfolio risk engine.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-3 shrink-0">
            <Link
              href="/portfolio/risk"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Check Portfolio Risk Engine</span>
            </Link>
          </div>
        </div>

        {/* Highlight KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Promoter & Insider Buying</div>
            <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              +₹{summary.totalBuyingValueCr.toLocaleString()} Cr
            </div>
            <div className="text-[10px] text-muted-foreground">Open market & creep acquisitions</div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Promoter & Insider Selling</div>
            <div className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
              -₹{summary.totalSellingValueCr.toLocaleString()} Cr
            </div>
            <div className="text-[10px] text-muted-foreground">OFS & secondary monetization</div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Active High-Pledge Alerts</div>
            <div className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-red-500" />
              <span>{summary.pledgeAlertsCount} Companies</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Pledge increase / &gt; 30% encumbered</div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Block & Bulk Deals</div>
            <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
              ₹{(summary.blockDealsValueCr + summary.bulkDealsValueCr).toLocaleString()} Cr
            </div>
            <div className="text-[10px] text-muted-foreground">NSE designated block & bulk windows</div>
          </div>
        </div>
      </div>

      {/* 9 Category Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-card border border-border/60">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <span>{cat.label}</span>
              {cat.badge && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    cat.badge === "RISK"
                      ? "bg-red-500 text-white"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company, symbol, promoter, or rationale..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sector Filter */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none"
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "ALL" ? "All Sectors" : sec}
              </option>
            ))}
          </select>

          {/* Portfolio Only Toggle */}
          <button
            onClick={() => setOnlyMyPortfolio(!onlyMyPortfolio)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all ${
              onlyMyPortfolio
                ? "bg-primary/10 border-primary text-primary"
                : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Held in My Portfolio {heldSymbols.size > 0 ? `(${heldSymbols.size})` : ""}</span>
          </button>

          {(selectedCategory !== "ALL" || selectedSector !== "ALL" || onlyMyPortfolio || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedSector("ALL");
                setOnlyMyPortfolio(false);
                setSearchTerm("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground font-medium underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Activities Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Promoter & Insider Transactions ({filteredActivities.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified corporate filings reported under SEBI SAST, PIT, and stock exchange trading windows
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            {summary.reportingPeriod}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/60">
              <tr>
                <th className="px-4 py-3">Security Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Entity / Person</th>
                <th className="px-4 py-3 text-right">Value (₹ Cr)</th>
                <th className="px-4 py-3 text-right">Stake Δ / Pledge</th>
                <th className="px-4 py-3 text-center">Risk Impact</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredActivities.map((act) => {
                const isHeld = heldSymbols.has(act.symbol.toUpperCase());
                const isExpanded = expandedId === act.id;

                return (
                  <tr key={act.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground text-sm">{act.symbol}</span>
                          {isHeld && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">
                              In Portfolio
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={act.companyName}>
                          {act.companyName}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {getCategoryBadge(act.category)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[220px]" title={act.personName}>
                          {act.personName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {act.personCategory}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold tabular-nums text-foreground">
                      ₹{act.transactionValueCr.toLocaleString()} Cr
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {act.sharesCount.toLocaleString()} shares @ ₹{act.transactionPriceInr}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                      {act.pledgePctOfPromoterHolding != null ? (
                        <div className="flex flex-col items-end">
                          <span className="text-red-600 dark:text-red-400">
                            {act.pledgePctOfPromoterHolding}% Pledged
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({act.pledgePctOfTotalEquity}% of company)
                          </span>
                        </div>
                      ) : act.stakePctChange !== 0 ? (
                        <div className="flex flex-col items-end">
                          <span className={act.stakePctChange > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {act.stakePctChange > 0 ? "+" : ""}{act.stakePctChange}%
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            Now {act.stakePctAfter}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Encumbrance update</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {getRiskImpactBadge(act.riskImpact)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : act.id)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                      >
                        <span>{isExpanded ? "Hide" : "Analysis"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredActivities.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No transactions found matching the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Analysis Drawer */}
      {expandedId && (
        <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          {(() => {
            const act = activities.find((a) => a.id === expandedId);
            if (!act) return null;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{act.companyName} ({act.symbol})</span>
                      <span className="text-xs text-muted-foreground font-normal">• {act.sector}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Transaction Date: {act.transactionDate} • Reported under {act.sourceRegulation} on {act.exchange}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded bg-card border border-border"
                  >
                    Close
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-2 text-xs">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <span>Investment & Governance Rationale</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {act.rationale}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
