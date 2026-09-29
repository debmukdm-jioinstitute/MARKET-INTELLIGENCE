"use client";

import { useState, useMemo } from "react";
import type { MutualFund, FundHolding } from "@/lib/funds/types";
import {
  Layers,
  PieChart,
  Activity,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  ExternalLink,
  ShieldAlert,
  Sliders,
  DollarSign,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  GitCompare,
} from "lucide-react";

interface FundXRayProps {
  fund: MutualFund;
  allFunds: MutualFund[];
  onSelectFund: (fundId: string) => void;
  onNavigateToOverlap?: (fundAId: string, fundBId?: string) => void;
}

export function FundXRayView({
  fund,
  allFunds,
  onSelectFund,
  onNavigateToOverlap,
}: FundXRayProps) {
  const [holdingSearch, setHoldingSearch] = useState("");
  const [selectedCapFilter, setSelectedCapFilter] = useState("All");
  const [selectedSectorFilter, setSelectedSectorFilter] = useState("All");
  const [changesTab, setChangesTab] = useState<"accumulated" | "trimmed" | "new" | "exits">("accumulated");

  // Distinct sectors in fund
  const fundSectors = useMemo(() => {
    const set = new Set<string>();
    fund.holdings.forEach((h) => set.add(h.sector));
    return ["All", ...Array.from(set).sort()];
  }, [fund.holdings]);

  // Filtered holdings
  const filteredHoldings = useMemo(() => {
    return fund.holdings.filter((h) => {
      if (selectedCapFilter !== "All" && h.marketCapCategory !== selectedCapFilter) return false;
      if (selectedSectorFilter !== "All" && h.sector !== selectedSectorFilter) return false;
      if (holdingSearch.trim() !== "") {
        const q = holdingSearch.toLowerCase().trim();
        const match =
          h.symbol.toLowerCase().includes(q) ||
          h.name.toLowerCase().includes(q) ||
          h.sector.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [fund.holdings, selectedCapFilter, selectedSectorFilter, holdingSearch]);

  const getStatusBadge = (status: FundHolding["changeStatus"], changePct: number) => {
    switch (status) {
      case "ACCUMULATED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            +{changePct}% Added
          </span>
        );
      case "TRIMMED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
            <TrendingDown className="w-3 h-3" />
            {changePct}% Trimmed
          </span>
        );
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
            <Sparkles className="w-3 h-3" />
            New Entry
          </span>
        );
      case "EXIT":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
            Exited
          </span>
        );
      default:
        return <span className="text-[11px] text-muted-foreground">Unchanged</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. FUND HEADER & SELECTOR */}
      <div className="p-6 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-primary/5 backdrop-blur-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {fund.category}
              </span>
              <span className="text-xs text-muted-foreground">AMFI: {fund.amfiCode}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{fund.amc}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {fund.name}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span>Benchmark: <strong className="text-foreground">{fund.benchmark}</strong></span>
              <span>•</span>
              <span>Inception: {fund.inceptionDate}</span>
            </p>
          </div>

          {/* Quick Fund Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground sm:sr-only">Switch Fund:</label>
            <select
              value={fund.id}
              onChange={(e) => onSelectFund(e.target.value)}
              className="px-3.5 py-2 text-sm bg-muted/60 border border-border/60 rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {allFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.shortName} ({f.category})
                </option>
              ))}
            </select>

            <button
              onClick={() => onNavigateToOverlap?.(fund.id)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare Overlap</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">AUM</div>
            <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">
              ₹{fund.aumCr.toLocaleString()} Cr
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Latest NAV</div>
            <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">
              ₹{fund.nav.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground">{fund.navDate}</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Expense Ratio (TER)</div>
            <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">
              {fund.expenseRatioPct}%
            </div>
            <div className="text-[10px] text-muted-foreground">Direct Plan</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Turnover Ratio</div>
            <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">
              {fund.managerBehaviour.turnoverRatioPct}%
            </div>
            <div className="text-[10px] text-muted-foreground">Annualized</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Active Share</div>
            <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {fund.managerBehaviour.activeSharePct}%
            </div>
            <div className="text-[10px] text-muted-foreground">vs Benchmark</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Cash Holding</div>
            <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">
              {fund.concentration.marketCapBreakdown.cashPct}%
            </div>
            <div className="text-[10px] text-muted-foreground">{fund.managerBehaviour.cashStance.cashTrend}</div>
          </div>
        </div>

        {/* Quick Nav Anchors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">X-Ray Hierarchy:</span>
          <a href="#holdings" className="hover:text-primary transition-colors underline-offset-4 hover:underline">1. Holdings ({fund.holdings.length})</a>
          <span>→</span>
          <a href="#sector" className="hover:text-primary transition-colors underline-offset-4 hover:underline">2. Sector Exposure</a>
          <span>→</span>
          <a href="#factors" className="hover:text-primary transition-colors underline-offset-4 hover:underline">3. Factor Profile</a>
          <span>→</span>
          <a href="#concentration" className="hover:text-primary transition-colors underline-offset-4 hover:underline">4. Concentration</a>
          <span>→</span>
          <a href="#changes" className="hover:text-primary transition-colors underline-offset-4 hover:underline">5. MoM Changes</a>
          <span>→</span>
          <a href="#manager" className="hover:text-primary transition-colors underline-offset-4 hover:underline">6. Manager Behaviour</a>
        </div>
      </div>

      {/* 2. HOLDINGS DRILLDOWN */}
      <section id="holdings" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              1. Portfolio Holdings ({filteredHoldings.length} of {fund.holdings.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full portfolio disclosure as per SEBI monthly reporting mandate ({fund.disclosureDate})
            </p>
          </div>

          <a
            href={fund.disclosureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            <span>Official AMC Disclosure Sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-card">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search holding by symbol or name..."
              value={holdingSearch}
              onChange={(e) => setHoldingSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSectorFilter}
              onChange={(e) => setSelectedSectorFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none"
            >
              {fundSectors.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Sectors" : s}</option>
              ))}
            </select>

            <select
              value={selectedCapFilter}
              onChange={(e) => setSelectedCapFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none"
            >
              <option value="All">All Market Caps</option>
              <option value="Large Cap">Large Cap</option>
              <option value="Mid Cap">Mid Cap</option>
              <option value="Small Cap">Small Cap</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/60">
                <tr>
                  <th className="px-4 py-3">Security Name</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Market Cap</th>
                  <th className="px-4 py-3 text-right">Weight (%)</th>
                  <th className="px-4 py-3 text-right">Value (₹ Cr)</th>
                  <th className="px-4 py-3 text-right">Shares Held</th>
                  <th className="px-4 py-3 text-center">MoM Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredHoldings.map((h) => (
                  <tr key={h.symbol} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{h.symbol}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={h.name}>
                          {h.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground font-medium">{h.sector}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                        {h.marketCapCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                      {h.weightPct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground font-medium tabular-nums">
                      ₹{h.marketValueCr.toLocaleString()} Cr
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {h.shares.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(h.changeStatus, h.sharesChangePct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. SECTOR EXPOSURE VS BENCHMARK */}
      <section id="sector" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            2. Sector Exposure & Active Bets vs Benchmark ({fund.benchmark})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare fund sector weights against benchmark weights to spot active overweights and underweights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fund.sectorExposure.map((sec) => {
            const isOverweight = sec.diffPct >= 0;
            return (
              <div
                key={sec.sector}
                className="p-4 rounded-xl border border-border/60 bg-card space-y-2.5"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{sec.sector}</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold tabular-nums">
                    <span className={isOverweight ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      {isOverweight ? "+" : ""}{sec.diffPct.toFixed(2)}%
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {isOverweight ? "Overweight" : "Underweight"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Fund Weight: <strong className="text-foreground">{sec.weightPct}%</strong></span>
                    <span>Benchmark: {sec.benchmarkWeightPct}%</span>
                  </div>
                  {/* Progress visualization */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${Math.min(sec.weightPct * 2.5, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. FACTOR EXPOSURE PROFILE */}
      <section id="factors" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            3. Quantitative Factor Exposure Profile
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Systematic factor tilts revealing style biases across Value, Quality, Growth, Momentum, Size, and Volatility
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fund.factorExposure.map((fac) => (
            <div key={fac.factor} className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{fac.factor}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {fac.label}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Score: <strong className="text-foreground tabular-nums">{fac.score > 0 ? "+" : ""}{fac.score.toFixed(2)}</strong></span>
                  <span>{fac.percentile}th Percentile</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${fac.percentile}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {fac.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CONCENTRATION & MARKET CAP SPLIT */}
      <section id="concentration" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            4. Concentration Metrics & Capital Allocation
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Portfolio density, Herfindahl index, effective stock count, and market-cap distribution
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Concentration card */}
          <div className="p-5 rounded-xl border border-border/60 bg-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Portfolio Concentration</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground">Top 5 Stocks Weight</div>
                <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
                  {fund.concentration.top5WeightPct}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground">Top 10 Stocks Weight</div>
                <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
                  {fund.concentration.top10WeightPct}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground">Herfindahl Index (HHI)</div>
                <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
                  {fund.concentration.hhi}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {fund.concentration.hhi > 600 ? "Highly Concentrated" : "Moderately Diversified"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground">Effective Number of Stocks</div>
                <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
                  {fund.concentration.effectiveNumStocks}
                </div>
                <div className="text-[10px] text-muted-foreground">Out of {fund.concentration.totalHoldingsCount} total</div>
              </div>
            </div>
          </div>

          {/* Market Cap distribution card */}
          <div className="p-5 rounded-xl border border-border/60 bg-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Market Cap Breakdown</h3>
            <div className="space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Large Cap</span>
                  <span className="font-bold tabular-nums text-foreground">{fund.concentration.marketCapBreakdown.largeCapPct}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${fund.concentration.marketCapBreakdown.largeCapPct}%` }} />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Mid Cap</span>
                  <span className="font-bold tabular-nums text-foreground">{fund.concentration.marketCapBreakdown.midCapPct}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${fund.concentration.marketCapBreakdown.midCapPct}%` }} />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Small Cap</span>
                  <span className="font-bold tabular-nums text-foreground">{fund.concentration.marketCapBreakdown.smallCapPct}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${fund.concentration.marketCapBreakdown.smallCapPct}%` }} />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Cash & Equivalents</span>
                  <span className="font-bold tabular-nums text-foreground">{fund.concentration.marketCapBreakdown.cashPct}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${fund.concentration.marketCapBreakdown.cashPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PORTFOLIO CHANGES MOM */}
      <section id="changes" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            5. Month-over-Month Portfolio Changes ({fund.changesMoM.month})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Incremental adjustments showing what the fund manager bought, sold, initiated, or liquidated
          </p>
        </div>

        {/* Change tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-2">
          <button
            onClick={() => setChangesTab("accumulated")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              changesTab === "accumulated"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Accumulated ({fund.changesMoM.accumulated.length})
          </button>

          <button
            onClick={() => setChangesTab("trimmed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              changesTab === "trimmed"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Trimmed ({fund.changesMoM.trimmed.length})
          </button>

          <button
            onClick={() => setChangesTab("new")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              changesTab === "new"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            New Entries ({fund.changesMoM.newEntries.length})
          </button>

          <button
            onClick={() => setChangesTab("exits")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              changesTab === "exits"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Complete Exits ({fund.changesMoM.completeExits.length})
          </button>
        </div>

        {/* Change list */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          {(() => {
            const list =
              changesTab === "accumulated"
                ? fund.changesMoM.accumulated
                : changesTab === "trimmed"
                ? fund.changesMoM.trimmed
                : changesTab === "new"
                ? fund.changesMoM.newEntries
                : fund.changesMoM.completeExits;

            if (list.length === 0) {
              return (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No {changesTab} recorded for this fund in {fund.changesMoM.month}.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((item) => (
                  <div
                    key={item.symbol}
                    className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">{item.symbol}</span>
                      {getStatusBadge(item.changeStatus, item.sharesChangePct)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{item.name}</div>
                    <div className="flex justify-between text-xs pt-1 border-t border-border/30 text-muted-foreground">
                      <span>Weight: <strong className="text-foreground">{item.weightPct}%</strong></span>
                      <span className="tabular-nums">₹{item.marketValueCr.toLocaleString()} Cr</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* 7. MANAGER BEHAVIOUR & CONVICTION BETS */}
      <section id="manager" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            6. Manager Behaviour & High-Conviction Active Bets
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lead fund manager philosophy, tenure stability, trading discipline, and non-consensus off-benchmark positions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Manager profile card */}
          <div className="p-5 rounded-xl border border-border/60 bg-card space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">Lead Portfolio Manager</div>
              <h3 className="text-lg font-bold text-foreground">{fund.managerBehaviour.managerName}</h3>
              <p className="text-xs text-muted-foreground">
                Tenure on this fund: <strong className="text-foreground">{fund.managerBehaviour.managerTenureYears} Years</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-muted/40 border border-border/40 space-y-2 text-xs">
              <div className="font-semibold text-foreground">Core Investment Philosophy</div>
              <p className="text-muted-foreground leading-relaxed">
                {fund.managerBehaviour.philosophy}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Stance Trend:</span>
                <span className="font-semibold text-foreground">{fund.managerBehaviour.cashStance.cashTrend}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Cash Allocation:</span>
                <span className="font-bold tabular-nums text-foreground">{fund.managerBehaviour.cashStance.currentCashPct}%</span>
              </div>
            </div>
          </div>

          {/* High Conviction bets */}
          <div className="lg:col-span-2 p-5 rounded-xl border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                High-Conviction Non-Consensus Bets
              </h3>
              <span className="text-xs text-muted-foreground">
                Highest active overweight positions
              </span>
            </div>

            <div className="space-y-3">
              {fund.managerBehaviour.convictionBets.map((bet) => (
                <div
                  key={bet.symbol}
                  className="p-3.5 rounded-lg bg-muted/30 border border-border/40 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-foreground text-sm">{bet.symbol}</span>
                      <span className="text-xs text-muted-foreground ml-2">({bet.name})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Fund: <strong>{bet.fundWeightPct}%</strong></span>
                      <span className="text-muted-foreground">BM: {bet.benchmarkWeightPct}%</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        +{bet.activeWeightPct}% Active
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Investment Rationale:</strong> {bet.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
