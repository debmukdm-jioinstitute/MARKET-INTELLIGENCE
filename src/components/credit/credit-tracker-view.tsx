"use client";

import { useState, useMemo, Fragment } from "react";
import type {
  CreditActivityRecord,
  CreditRatingAgency,
  CreditEventAction,
  MarketCapCategory,
  SmallcapFundCreditProfile,
} from "@/lib/credit/types";
import { getSmallcapFundsCreditProfiles } from "@/lib/credit/database";
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
  PieChart,
  ChevronLeft,
  ChevronRight,
  Filter,
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
  smallcapFunds?: SmallcapFundCreditProfile[];
}

export function CreditTrackerView({
  activities,
  summary,
  smallcapFunds = getSmallcapFundsCreditProfiles(),
}: CreditTrackerViewProps) {
  const { data: portfolioData } = useMyPortfolio();
  const heldSymbols = useMemo(() => {
    return new Set(portfolioData?.positions?.map((p) => p.symbol.toUpperCase()) ?? []);
  }, [portfolioData?.positions]);

  // Main View Mode: "stocks" | "smallcap_funds"
  const [viewMode, setViewMode] = useState<"stocks" | "smallcap_funds">("stocks");

  // Stock Filter States
  const [selectedCap, setSelectedCap] = useState<string>("ALL");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedAgency, setSelectedAgency] = useState<string>("ALL");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEquityConnection, setShowEquityConnection] = useState(true);
  const [onlyMyPortfolio, setOnlyMyPortfolio] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination for 500+ stocks
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Smallcap Fund Search Filter
  const [fundSearchTerm, setFundSearchTerm] = useState("");
  const [expandedFundId, setExpandedFundId] = useState<string | null>(null);

  const actionTabs: { id: string; label: string; badge?: string }[] = [
    { id: "ALL", label: "All Actions" },
    { id: "RATING_UPGRADE", label: "Upgrades", badge: "POSITIVE" },
    { id: "RATING_DOWNGRADE", label: "Downgrades", badge: "RISK" },
    { id: "OUTLOOK_CHANGE", label: "Outlook Changes" },
    { id: "CREDIT_WATCH", label: "Credit Watch", badge: "WATCH" },
    { id: "DEFAULT", label: "Default & Insolvency", badge: "CRITICAL" },
    { id: "LIQUIDITY_CONCERN", label: "Liquidity Concerns", badge: "ALERT" },
  ];

  const capTabs: { id: string; label: string }[] = [
    { id: "ALL", label: `All Caps (${activities.length} Stocks)` },
    { id: "LARGE_CAP", label: "Large Cap (Nifty 100)" },
    { id: "MID_CAP", label: "Mid Cap (Midcap 150)" },
    { id: "SMALL_CAP", label: "Small Cap (Smallcap 250+)" },
  ];

  const agencies: string[] = ["ALL", "CRISIL", "ICRA", "CARE Ratings", "India Ratings", "Acuité", "Brickwork"];

  const sectors = useMemo(() => {
    const s = new Set<string>();
    activities.forEach((a) => s.add(a.sector));
    return ["ALL", ...Array.from(s).sort()];
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedCap !== "ALL" && act.marketCapCategory !== selectedCap) {
        return false;
      }
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
  }, [activities, selectedCap, selectedAction, selectedAgency, selectedSector, onlyMyPortfolio, heldSymbols, searchTerm]);

  useMemo(() => {
    setPage(1);
  }, [selectedCap, selectedAction, selectedAgency, selectedSector, onlyMyPortfolio, searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const paginatedActivities = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, page, pageSize]);

  // Filtered smallcap funds
  const filteredSmallcapFunds = useMemo(() => {
    if (!fundSearchTerm.trim()) return smallcapFunds;
    const q = fundSearchTerm.toLowerCase().trim();
    return smallcapFunds.filter(
      (f) =>
        f.fundName.toLowerCase().includes(q) ||
        f.amc.toLowerCase().includes(q) ||
        f.flaggedHoldings.some((h) => h.symbol.toLowerCase().includes(q) || h.companyName.toLowerCase().includes(q))
    );
  }, [smallcapFunds, fundSearchTerm]);

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
            Liquidity Alert
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

  const getCapBadge = (cap?: MarketCapCategory) => {
    switch (cap) {
      case "LARGE_CAP":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "MID_CAP":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "SMALL_CAP":
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
  };

  const getCapLabel = (cap?: MarketCapCategory) => {
    switch (cap) {
      case "LARGE_CAP":
        return "Large Cap";
      case "MID_CAP":
        return "Mid Cap";
      case "SMALL_CAP":
      default:
        return "Small Cap";
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
      case "OVERREACTION":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
            <Activity className="w-3 h-3" />
            Market Overreaction
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Surveillance Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode("stocks")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === "stocks"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>All Stocks Surveillance ({activities.length} Equities)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300">
              Nifty 500 Covered
            </span>
          </button>

          <button
            onClick={() => setViewMode("smallcap_funds")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === "smallcap_funds"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Smallcap Funds Credit Watch ({smallcapFunds.length} Funds)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-300">
              AMFI Stress Test
            </span>
          </button>
        </div>

        <Link
          href="/portfolio/risk"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-border/80 bg-muted/40 text-foreground hover:bg-muted transition-colors"
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>My Portfolio Credit Health</span>
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="p-6 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-primary/5 backdrop-blur-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>Full Fixed Income & Corporate Solvency Surveillance</span>
              <span className="text-muted-foreground">•</span>
              <span>All 501 Nifty 500 Constituents + Smallcap Funds</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {viewMode === "stocks"
                ? "Credit & Risk Intelligence Desk"
                : "Smallcap Mutual Funds — Credit & Liquidity Surveillance"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {viewMode === "stocks"
                ? "Continuous fixed-income surveillance across CRISIL, ICRA, CARE Ratings, India Ratings, Acuité, and Brickwork. Every Nifty 500 stock is monitored for upgrades, downgrades, debt watch, defaults, and liquidity strain."
                : "AMFI-mandated liquidity stress testing and portfolio credit analysis across India's top 12 Small Cap Mutual Funds. Track days required to liquidate 20% / 50% of the portfolio, high-grade debt buffers, and flagged smallcap holdings."}
            </p>
            <IntelligenceSourceStrip sources={CREDIT_RISK_PANEL_SOURCES} className="pt-1" />
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-3 shrink-0">
            <Link
              href="/funds"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <PieChart className="w-4 h-4" />
              <span>Mutual Fund X-Ray</span>
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
            <div className="text-[10px] text-muted-foreground">Across {activities.length} covered issuers</div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Credit Watch Warnings</div>
            <div className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{summary.creditWatchCount} Active</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Negative / developing watch</div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Smallcap Funds AUM Scanned</div>
            <div className="text-xl font-bold tabular-nums text-foreground mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>₹2.48L Cr</span>
            </div>
            <div className="text-[10px] text-muted-foreground">12 top funds with AMFI stress test</div>
          </div>
        </div>
      </div>

      {viewMode === "stocks" ? (
        <>
          {/* Market Cap Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-card border border-border/60">
            <span className="text-xs font-semibold text-muted-foreground px-2 py-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Market Cap:
            </span>
            {capTabs.map((tab) => {
              const isActive = selectedCap === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCap(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
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

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search any Nifty 500 company, ticker (e.g. TCS, SUZLON, TRENT), agency, or rationale..."
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
                className="px-3 py-2 text-xs sm:text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none max-w-[170px]"
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
                <span>Equity Prices</span>
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
            <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Credit Rating Surveillance ({filteredActivities.length} Matches)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing page {page} of {totalPages} (25 stocks per page across Nifty 500 & smallcaps)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Per page:</span>
                {[25, 50, 100].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPageSize(sz)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      pageSize === sz ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3">Security & Cap</th>
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
                  {paginatedActivities.map((act) => {
                    const isHeld = heldSymbols.has(act.symbol.toUpperCase());
                    const isExpanded = expandedId === act.id;
                    const eq = act.equityConnection;
                    const isEqPositive = eq.equityReturnSinceActionPct >= 0;

                    return (
                      <Fragment key={act.id}>
                      <tr className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground text-sm">{act.symbol}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getCapBadge(
                                  act.marketCapCategory
                                )}`}
                              >
                                {getCapLabel(act.marketCapCategory)}
                              </span>
                              {isHeld && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">
                                  In Portfolio
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={act.companyName}>
                              {act.companyName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{act.sector}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getAgencyBadge(
                              act.agency
                            )}`}
                          >
                            {act.agency}
                          </span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{act.actionDate}</div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getActionBadge(act.action)}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground line-through">{act.ratingBefore}</span>
                            <span className="text-xs text-muted-foreground">→</span>
                            <span className="text-xs font-bold text-foreground">{act.ratingAfter}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Outlook: <strong>{act.outlookAfter}</strong>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-foreground">
                          ₹{act.ratedDebtAmountCr.toLocaleString("en-IN")}
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {act.liquidityAssessment}
                          </div>
                        </td>

                        {showEquityConnection && (
                          <>
                            <td className="px-4 py-3.5 text-right font-bold tabular-nums text-foreground">
                              ₹{eq.currentPriceInr.toLocaleString("en-IN")}
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
                            <span>{isExpanded ? "Hide" : "Rationale analysis"}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-primary/5">
                          <td
                            colSpan={showEquityConnection ? 9 : 6}
                            className="border-b border-primary/20 px-4 py-4"
                          >
                            <CreditRationalePanel act={act} onClose={() => setExpandedId(null)} />
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
                    );
                  })}

                  {paginatedActivities.length === 0 && (
                    <tr>
                      <td colSpan={showEquityConnection ? 9 : 6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No credit rating actions found matching the selected filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredActivities.length)} of {filteredActivities.length} stocks
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-border/60 bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-border/60 bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Smallcap Mutual Funds Credit Surveillance View */
        <div className="space-y-6">
          {/* Smallcap Fund Search Bar */}
          <div className="p-4 rounded-xl border border-border/60 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search smallcap fund name, AMC, or held smallcap stock..."
                value={fundSearchTerm}
                onChange={(e) => setFundSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-4 h-4 text-primary" />
              <span>Mandated by SEBI / AMFI circular on Liquidity Stress Testing for Mid & Small Cap Schemes</span>
            </div>
          </div>

          {/* Grid of 12 Smallcap Funds */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSmallcapFunds.map((fund) => {
              const isExpanded = expandedFundId === fund.id;
              const hasFlagged = fund.flaggedHoldingsCount > 0;

              return (
                <div
                  key={fund.id}
                  className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {fund.amc}
                        </span>
                        <h3 className="text-base font-bold text-foreground leading-snug">
                          {fund.fundName}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        ₹{(fund.aumCr / 1000).toFixed(1)}k Cr AUM
                      </span>
                    </div>

                    {/* AMFI Stress Test Metric Badges */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Days to Liquidate 20%</div>
                        <div className="font-bold text-sm text-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>{fund.liquidityStressDays20Pct} Days</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Days to Liquidate 50%</div>
                        <div className="font-bold text-sm text-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{fund.liquidityStressDays50Pct} Days</span>
                        </div>
                      </div>
                    </div>

                    {/* Credit Allocation Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Portfolio Paper Quality</span>
                        <span className="font-semibold text-foreground">Score: {fund.portfolioCreditScore}/100</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden flex bg-muted">
                        <div
                          style={{ width: `${fund.cashAndSovereignPct}%` }}
                          className="bg-emerald-500"
                          title={`Cash/Sovereign: ${fund.cashAndSovereignPct}%`}
                        />
                        <div
                          style={{ width: `${fund.highGradeDebtPct}%` }}
                          className="bg-blue-500"
                          title={`High Grade (AAA/AA): ${fund.highGradeDebtPct}%`}
                        />
                        <div
                          style={{ width: `${fund.moderateGradeDebtPct}%` }}
                          className="bg-amber-500"
                          title={`Moderate (A/BBB): ${fund.moderateGradeDebtPct}%`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash: {fund.cashAndSovereignPct}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" /> AAA/AA: {fund.highGradeDebtPct}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> A/BBB: {fund.moderateGradeDebtPct}%
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {fund.creditRiskSummary}
                    </p>

                    {/* Flagged Holdings Watch */}
                    {hasFlagged ? (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-semibold text-amber-700 dark:text-amber-300">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{fund.flaggedHoldingsCount} Watchlist Holding(s)</span>
                          </span>
                          <button
                            onClick={() => setExpandedFundId(isExpanded ? null : fund.id)}
                            className="text-[10px] text-primary hover:underline"
                          >
                            {isExpanded ? "Hide" : "View"}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="space-y-1.5 pt-1 border-t border-amber-500/20">
                            {fund.flaggedHoldings.map((h, i) => (
                              <div key={i} className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">
                                  {h.companyName} ({h.symbol})
                                </span>
                                <span className="tabular-nums font-bold text-amber-600 dark:text-amber-400">
                                  {h.weightPct}% weight · {h.rating}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Zero flagged or distressed holdings in portfolio</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Grade: <strong className="text-foreground">{fund.creditHealthGrade.replace("_", " ")}</strong>
                    </span>
                    <Link
                      href="/funds"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>Full Fund X-Ray</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CreditRationalePanel({
  act,
  onClose,
}: {
  act: CreditActivityRecord;
  onClose: () => void;
}) {
  const eq = act.equityConnection;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-2">
        <div className="space-y-0.5">
          <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
            <span className="tabular-nums">{act.symbol}</span>
            <span className="font-semibold">{act.companyName}</span>
            <span className="text-xs font-normal text-muted-foreground">• {act.sector}</span>
          </h4>
          <p className="text-xs text-muted-foreground">
            {act.actionDate} • {act.agency} • ₹{act.ratedDebtAmountCr.toLocaleString("en-IN")} Cr {act.instrument}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            <span>{act.agency} rating rationale & liquidity review</span>
          </div>
          <p className="leading-relaxed text-muted-foreground">{act.agencyRationale}</p>
          <div className="space-y-1.5 border-t border-border/30 pt-2">
            <span className="font-semibold text-foreground">Key credit drivers</span>
            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
              {act.keyDrivers.map((driver, i) => (
                <li key={i}>{driver}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
            <span>
              Liquidity stance: <strong className="text-foreground">{act.liquidityAssessment}</strong>
            </span>
            {act.sourceUrl ? (
              <a
                href={act.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <span>Official rating document</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span>Connected equity price transmission</span>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/40 bg-muted/40 p-2.5 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground">Price at action</div>
              <div className="mt-0.5 font-bold tabular-nums text-foreground">₹{eq.priceAtActionInr}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Current price</div>
              <div className="mt-0.5 font-bold tabular-nums text-foreground">₹{eq.currentPriceInr}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Return since</div>
              <div
                className={`mt-0.5 font-bold tabular-nums ${
                  eq.equityReturnSinceActionPct >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {eq.equityReturnSinceActionPct >= 0 ? "+" : ""}
                {eq.equityReturnSinceActionPct}%
              </div>
            </div>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Financial market impact: </strong>
            {eq.equityImpactAnalysis}
          </p>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border/30 pt-2 text-[11px] text-muted-foreground">
            <span>Market cap: ₹{eq.marketCapCr.toLocaleString("en-IN")} Cr</span>
            <span>Implied credit spread: +{eq.impliedCreditSpreadBps} bps</span>
          </div>
        </div>
      </div>
    </div>
  );
}
