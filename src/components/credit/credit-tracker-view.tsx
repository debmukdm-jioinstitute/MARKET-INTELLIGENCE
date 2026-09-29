"use client";

import { useState, useMemo } from "react";
import type { CreditActivityRecord, CreditEventAction, CreditRatingAgency } from "@/lib/credit/types";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Building2,
  DollarSign,
  Activity,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Briefcase,
  Flame,
  CheckCircle2,
  Info,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { CREDIT_RISK_PANEL_SOURCES } from "@/lib/intelligence/verification-links";
import { IntelligenceSourceStrip } from "@/components/ui/verify-at-source-link";

interface CreditTrackerViewProps {
  activities: CreditActivityRecord[];
  summary: {
    totalActionsTracked: number;
    upgradesCount: number;
    downgradesCount: number;
    creditWatchCount: number;
    defaultsCount: number;
    liquidityConcernsCount: number;
    totalRatedDebtCr: number;
    creditMigrationRatio: number;
    netCreditStance: string;
    reportingPeriod: string;
  };
}

export function CreditTrackerView({ activities, summary }: CreditTrackerViewProps) {
  const { data: portfolioData } = useMyPortfolio();
  const heldSymbols = useMemo(() => {
    return new Set(portfolioData?.positions?.map((p) => p.symbol.toUpperCase()) ?? []);
  }, [portfolioData?.positions]);

  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedAgency, setSelectedAgency] = useState<string>("ALL");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEquityConnection, setShowEquityConnection] = useState(true);
  const [onlyMyPortfolio, setOnlyMyPortfolio] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const actionTabs: { id: string; label: string; badge?: string }[] = [
    { id: "ALL", label: "All Actions" },
    { id: "RATING_UPGRADE", label: "Upgrades", badge: "POSITIVE" },
    { id: "RATING_DOWNGRADE", label: "Downgrades", badge: "RISK" },
    { id: "OUTLOOK_CHANGE", label: "Outlook Changes" },
    { id: "CREDIT_WATCH", label: "Credit Watch", badge: "WATCH" },
    { id: "DEFAULT", label: "Default & Restructuring", badge: "CRITICAL" },
    { id: "LIQUIDITY_CONCERN", label: "Liquidity Concerns", badge: "ALERT" },
  ];

  const agencies: string[] = ["ALL", "CRISIL", "ICRA", "CARE Ratings", "India Ratings", "Acuité", "Brickwork"];

  const sectors = useMemo(() => {
    const s = new Set<string>();
    activities.forEach((a) => s.add(a.sector));
    return ["ALL", ...Array.from(s).sort()];
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedAction !== "ALL") {
        if (selectedAction === "DEFAULT") {
          if (act.action !== "DEFAULT" && act.action !== "DEBT_RESTRUCTURING") return false;
        } else if (act.action !== selectedAction) {
          return false;
        }
      }
      if (selectedAgency !== "ALL" && act.agency !== selectedAgency) return false;
      if (selectedSector !== "ALL" && act.sector !== selectedSector) return false;
      if (onlyMyPortfolio && !heldSymbols.has(act.symbol.toUpperCase())) return false;
      if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase().trim();
        const match =
          act.symbol.toLowerCase().includes(q) ||
          act.companyName.toLowerCase().includes(q) ||
          act.agency.toLowerCase().includes(q) ||
          act.sector.toLowerCase().includes(q) ||
          act.agencyRationale.toLowerCase().includes(q) ||
          act.equityConnection.equityImpactAnalysis.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activities, selectedAction, selectedAgency, selectedSector, onlyMyPortfolio, heldSymbols, searchTerm]);

  const getActionBadge = (action: CreditEventAction) => {
    switch (action) {
      case "RATING_UPGRADE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-3 h-3" />
            Rating Upgrade
          </span>
        );
      case "RATING_DOWNGRADE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-3 h-3" />
            Rating Downgrade
          </span>
        );
      case "OUTLOOK_CHANGE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Activity className="w-3 h-3" />
            Outlook Shift
          </span>
        );
      case "CREDIT_WATCH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Credit Watch
          </span>
        );
      case "DEFAULT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600/10 text-red-600 dark:text-red-400 border border-red-600/20">
            <AlertOctagon className="w-3 h-3 text-red-500" />
            Default (D)
          </span>
        );
      case "DEBT_RESTRUCTURING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Layers className="w-3 h-3" />
            Debt Restructuring
          </span>
        );
      case "LIQUIDITY_CONCERN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <Flame className="w-3 h-3 text-red-500" />
            Liquidity Concern
          </span>
        );
      default:
        return null;
    }
  };

  const getAgencyBadge = (agency: CreditRatingAgency) => {
    switch (agency) {
      case "CRISIL":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "ICRA":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "CARE Ratings":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "India Ratings":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "Acuité":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      case "Brickwork":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTransmissionBadge = (trans: string) => {
    switch (trans) {
      case "CONVICTION_RALLY":
      case "DELEVERAGING_EXPANSION":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            Equity Re-Rating
          </span>
        );
      case "IMMEDIATE_PRICED_IN":
        return (
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium">
            Immediate Priced-in
          </span>
        );
      case "EQUITY_LAGGED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            Equity Lagging
          </span>
        );
      case "DISTRESS_DISCOUNT":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
            <TrendingDown className="w-3 h-3" />
            Distress Discount
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
              <Building2 className="w-3.5 h-3.5" />
              <span>Credit Agency Surveillance & Debt-to-Equity Engine</span>
              <span className="text-muted-foreground">•</span>
              <span>{summary.reportingPeriod}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Credit / Risk Intelligence Desk
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Continuous monitoring across India&apos;s leading credit rating agencies — CRISIL, ICRA, CARE Ratings, India Ratings, Acuité, and Brickwork.
              Track rating upgrades, downgrades, outlook shifts, credit watch alerts, defaults, and debt restructurings — connected directly to equity stock prices.
            </p>
            <IntelligenceSourceStrip sources={CREDIT_RISK_PANEL_SOURCES} className="pt-1" />
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-3 shrink-0">
            <Link
              href="/portfolio/risk"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Portfolio Credit Risk</span>
            </Link>
          </div>
        </div>

        {/* Highlight KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Credit Migration Ratio</div>
            <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.creditMigrationRatio}x (Up / Down)
            </div>
            <div className="text-[10px] text-muted-foreground">{summary.upgradesCount} Upgrades vs {summary.downgradesCount} Downgrades</div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Total Rated Debt Quantum</div>
            <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
              ₹{(summary.totalRatedDebtCr / 1000).toFixed(1)}k Cr
            </div>
            <div className="text-[10px] text-muted-foreground">Bank facilities, NCDs, and bonds</div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Credit Watch Warnings</div>
            <div className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{summary.creditWatchCount} Active</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Negative or developing watch</div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Default / Stressed Debt</div>
            <div className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-red-500" />
              <span>{summary.defaultsCount} Defaults</span>
            </div>
            <div className="text-[10px] text-muted-foreground">CIRP / NCLT resolution exposure</div>
          </div>
        </div>
      </div>

      {/* Action Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-card border border-border/60">
        {actionTabs.map((tab) => {
          const isActive = selectedAction === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedAction(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    tab.badge === "CRITICAL"
                      ? "bg-red-600 text-white"
                      : tab.badge === "RISK"
                      ? "bg-rose-500 text-white"
                      : tab.badge === "WATCH"
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters & Equity Connection Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company, ticker, agency, or credit rationale..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Agency Filter */}
          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none"
          >
            {agencies.map((ag) => (
              <option key={ag} value={ag}>
                {ag === "ALL" ? "All 6 Agencies" : ag}
              </option>
            ))}
          </select>

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

          {/* Equity Connection Toggle */}
          <button
            onClick={() => setShowEquityConnection(!showEquityConnection)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all ${
              showEquityConnection
                ? "bg-primary/10 border-primary text-primary"
                : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Connect Equity Prices</span>
          </button>

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
            <span>In Portfolio {heldSymbols.size > 0 ? `(${heldSymbols.size})` : ""}</span>
          </button>
        </div>
      </div>

      {/* Main Credit Actions Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Credit Rating Actions & Debt Transmissions ({filteredActivities.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified corporate credit filings cross-referenced with equity market reactions
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            CRISIL · ICRA · CARE · India Ratings · Acuité · Brickwork
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/60">
              <tr>
                <th className="px-4 py-3">Security Name</th>
                <th className="px-4 py-3">Agency</th>
                <th className="px-4 py-3">Credit Action</th>
                <th className="px-4 py-3">Rating Shift</th>
                <th className="px-4 py-3 text-right">Rated Debt (₹ Cr)</th>
                {showEquityConnection && (
                  <>
                    <th className="px-4 py-3 text-right">Stock Price (₹)</th>
                    <th className="px-4 py-3 text-right">Return Post-Action</th>
                    <th className="px-4 py-3 text-center">Equity Transmission</th>
                  </>
                )}
                <th className="px-4 py-3 text-right">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredActivities.map((act) => {
                const isHeld = heldSymbols.has(act.symbol.toUpperCase());
                const isExpanded = expandedId === act.id;
                const eq = act.equityConnection;
                const isEqPositive = eq.equityReturnSinceActionPct >= 0;

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
                        <span className="text-xs text-muted-foreground truncate max-w-[190px]" title={act.companyName}>
                          {act.companyName}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getAgencyBadge(act.agency)}`}>
                        {act.agency}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {getActionBadge(act.action)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground tabular-nums">
                          <span>{act.ratingBefore}</span>
                          <span className="text-muted-foreground font-normal">→</span>
                          <span className="text-primary">{act.ratingAfter}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Outlook: {act.outlookAfter}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold tabular-nums text-foreground">
                      ₹{act.ratedDebtAmountCr.toLocaleString()} Cr
                      <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[140px]" title={act.instrument}>
                        {act.instrument}
                      </div>
                    </td>

                    {showEquityConnection && (
                      <>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-foreground">
                          ₹{eq.currentPriceInr}
                          <div className="text-[10px] text-muted-foreground font-normal">
                            Spread: +{eq.impliedCreditSpreadBps} bps
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                          <div className="flex flex-col items-end">
                            <span className={isEqPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                              {isEqPositive ? "+" : ""}{eq.equityReturnSinceActionPct}%
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              1D: {eq.equity1DayReturnPct > 0 ? "+" : ""}{eq.equity1DayReturnPct}%
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {getTransmissionBadge(eq.transmission)}
                        </td>
                      </>
                    )}

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
                  <td colSpan={showEquityConnection ? 9 : 6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No credit rating actions found matching the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Rationale & Equity Impact Drawer */}
      {expandedId && (
        <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
          {(() => {
            const act = activities.find((a) => a.id === expandedId);
            if (!act) return null;
            const eq = act.equityConnection;

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{act.companyName} ({act.symbol})</span>
                      <span className="text-xs text-muted-foreground font-normal">• {act.sector}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Action Date: {act.actionDate} • Rated by {act.agency} on ₹{act.ratedDebtAmountCr.toLocaleString()} Cr {act.instrument}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1 rounded bg-card border border-border"
                  >
                    Close Analysis
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Agency Rationale & Key Drivers */}
                  <div className="p-4 rounded-xl bg-card border border-border/60 space-y-3 text-xs">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span>{act.agency} Rating Rationale & Liquidity Review</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {act.agencyRationale}
                    </p>
                    <div className="space-y-1.5 pt-2 border-t border-border/30">
                      <span className="font-semibold text-foreground">Key Credit Drivers:</span>
                      <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                        {act.keyDrivers.map((driver, i) => (
                          <li key={i}>{driver}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span>Liquidity Stance: <strong className="text-foreground">{act.liquidityAssessment}</strong></span>
                      {act.sourceUrl && (
                        <a
                          href={act.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <span>Official Rating Document</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Equity Price Transmission Connection */}
                  <div className="p-4 rounded-xl bg-card border border-border/60 space-y-3 text-xs">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span>Connected Equity Price Transmission</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-center">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Price at Action</div>
                        <div className="font-bold tabular-nums text-foreground mt-0.5">₹{eq.priceAtActionInr}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Current Price</div>
                        <div className="font-bold tabular-nums text-foreground mt-0.5">₹{eq.currentPriceInr}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Return Since</div>
                        <div className={`font-bold tabular-nums mt-0.5 ${eq.equityReturnSinceActionPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {eq.equityReturnSinceActionPct >= 0 ? "+" : ""}{eq.equityReturnSinceActionPct}%
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      <strong>Financial Market Impact: </strong>
                      {eq.equityImpactAnalysis}
                    </p>
                    <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground flex justify-between">
                      <span>Market Cap: ₹{eq.marketCapCr.toLocaleString()} Cr</span>
                      <span>Implied Credit Spread: +{eq.impliedCreditSpreadBps} bps</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
