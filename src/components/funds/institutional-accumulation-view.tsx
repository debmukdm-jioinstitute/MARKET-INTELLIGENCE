"use client";

import { useState, useMemo } from "react";
import type { StockAccumulationSummary } from "@/lib/funds/types";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Sparkles,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  PieChart,
} from "lucide-react";

interface AccumulationViewProps {
  stocks: StockAccumulationSummary[];
  topAccumulated: StockAccumulationSummary[];
  topTrimmed: StockAccumulationSummary[];
  freshEntries: StockAccumulationSummary[];
  sectorFlows: { sector: string; netInflowCr: number; buyingCount: number; sellingCount: number }[];
  summary: {
    totalNetCapitalCr: number;
    fundsTrackedCount: number;
    accumulatedStocksCount: number;
    trimmedStocksCount: number;
    disclosureMonth: string;
  };
  onSelectFund?: (fundId: string) => void;
}

export function InstitutionalAccumulationView({
  stocks,
  topAccumulated,
  topTrimmed,
  freshEntries,
  sectorFlows,
  summary,
  onSelectFund,
}: AccumulationViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const [selectedMarketCap, setSelectedMarketCap] = useState("All");
  const [selectedTrend, setSelectedTrend] = useState("All");
  const [expandedStock, setExpandedStock] = useState<string | null>(null);

  // Extract all available sectors
  const sectors = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) => set.add(s.sector));
    return ["All", ...Array.from(set).sort()];
  }, [stocks]);

  // Filter stocks
  const filteredStocks = useMemo(() => {
    return stocks.filter((item) => {
      if (selectedSector !== "All" && item.sector !== selectedSector) return false;
      if (selectedMarketCap !== "All" && item.marketCapCategory !== selectedMarketCap) return false;
      if (selectedTrend !== "All" && item.trend !== selectedTrend) return false;
      if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase().trim();
        const match =
          item.symbol.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [stocks, selectedSector, selectedMarketCap, selectedTrend, searchTerm]);

  const topBuyer = topAccumulated[0];
  const topSector = sectorFlows[0];

  const getTrendBadge = (trend: StockAccumulationSummary["trend"]) => {
    switch (trend) {
      case "HEAVY_ACCUMULATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-3 h-3" />
            Heavy Accumulation
          </span>
        );
      case "FRESH_ENTRY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3 h-3" />
            Fresh Entry
          </span>
        );
      case "MODERATE_BUYING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            Buying
          </span>
        );
      case "TRIMMING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Trimming
          </span>
        );
      case "HEAVY_DUMPING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-3 h-3" />
            Heavy Dumping
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-muted-foreground bg-muted">
            Neutral
          </span>
        );
    }
  };

  const getMarketCapBadge = (cap: string) => {
    switch (cap) {
      case "Large Cap":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "Mid Cap":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      case "Small Cap":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-primary/5 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>Cross-Fund Institutional Radar</span>
              <span className="text-muted-foreground">•</span>
              <span>{summary.disclosureMonth} Disclosures</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Which stocks are being accumulated across India&apos;s mutual funds?
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Consolidated intelligence aggregating monthly portfolio disclosures across India&apos;s leading asset management
              companies. Discover where premier fund managers are deploying incremental capital, initiating fresh positions,
              or paring down exposure.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-card border border-border/60 shadow-sm min-w-[130px]">
              <div className="text-xs text-muted-foreground">Funds Scanned</div>
              <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
                {summary.fundsTrackedCount} AMC Portfolios
              </div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-card border border-border/60 shadow-sm min-w-[140px]">
              <div className="text-xs text-muted-foreground">Accumulated Stocks</div>
              <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {summary.accumulatedStocksCount} Stocks
              </div>
            </div>
          </div>
        </div>

        {/* Highlight KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/60">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Top Accumulated Stock</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-foreground truncate">
              {topBuyer ? `${topBuyer.symbol} (${topBuyer.name})` : "None"}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
              +₹{topBuyer?.netValueBoughtCr.toLocaleString()} Cr across {topBuyer?.fundsBuyingCount} funds
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Leading Inflow Sector</span>
              <PieChart className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground truncate">
              {topSector ? topSector.sector : "Financial Services"}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
              +₹{topSector ? topSector.netInflowCr.toLocaleString() : 0} Cr net buying
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Fresh Institutional Entries</span>
              <Sparkles className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg font-bold tabular-nums text-foreground">
              {freshEntries.length} Fresh Bets
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {freshEntries.map((e) => e.symbol).slice(0, 3).join(", ") || "None"}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Net Capital Added</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              +₹{summary.totalNetCapitalCr.toLocaleString()} Cr
            </div>
            <div className="text-xs text-muted-foreground">
              Across tracked equity schemes
            </div>
          </div>
        </div>
      </div>

      {/* Sector Flow Overview Bar */}
      <div className="p-5 rounded-xl border border-border/60 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Sector-Wise Net Capital Deployment (₹ Cr)
            </h3>
            <p className="text-xs text-muted-foreground">
              Net incremental capital deployed by mutual funds across sectors this month
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2">
          {sectorFlows.slice(0, 6).map((flow) => {
            const isPositive = flow.netInflowCr >= 0;
            return (
              <div
                key={flow.sector}
                className="p-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1 cursor-pointer hover:bg-muted/70 transition-all"
                onClick={() => setSelectedSector(flow.sector)}
              >
                <div className="text-xs text-muted-foreground truncate" title={flow.sector}>
                  {flow.sector}
                </div>
                <div
                  className={`text-sm font-bold tabular-nums ${
                    isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isPositive ? "+" : ""}₹{flow.netInflowCr.toLocaleString()} Cr
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {flow.buyingCount} funds buying
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by stock symbol, company name, or sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sector filter */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="All">All Sectors</option>
            {sectors.filter((s) => s !== "All").map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Market Cap filter */}
          <select
            value={selectedMarketCap}
            onChange={(e) => setSelectedMarketCap(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="All">All Market Caps</option>
            <option value="Large Cap">Large Cap</option>
            <option value="Mid Cap">Mid Cap</option>
            <option value="Small Cap">Small Cap</option>
          </select>

          {/* Trend filter */}
          <select
            value={selectedTrend}
            onChange={(e) => setSelectedTrend(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-muted/50 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="All">All Institutional Trends</option>
            <option value="HEAVY_ACCUMULATION">Heavy Accumulation</option>
            <option value="FRESH_ENTRY">Fresh Entry</option>
            <option value="MODERATE_BUYING">Moderate Buying</option>
            <option value="TRIMMING">Trimming</option>
            <option value="HEAVY_DUMPING">Heavy Dumping</option>
          </select>

          {(selectedSector !== "All" || selectedMarketCap !== "All" || selectedTrend !== "All" || searchTerm) && (
            <button
              onClick={() => {
                setSelectedSector("All");
                setSelectedMarketCap("All");
                setSelectedTrend("All");
                setSearchTerm("");
              }}
              className="px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground font-medium underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Stocks Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Institutional Accumulation & Disposal Desk
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing {filteredStocks.length} stocks sorted by net mutual fund capital accumulated
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            September 2026 Disclosures
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/60">
              <tr>
                <th className="px-4 py-3">Stock / Company</th>
                <th className="px-4 py-3">Sector & Cap</th>
                <th className="px-4 py-3 text-right">Net Value Bought (₹ Cr)</th>
                <th className="px-4 py-3 text-center">Funds Action</th>
                <th className="px-4 py-3">Top Buyer Mutual Funds</th>
                <th className="px-4 py-3 text-center">Trend</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredStocks.map((stock) => {
                const isExpanded = expandedStock === stock.symbol;
                const isPositive = stock.netValueBoughtCr >= 0;

                return (
                  <tr key={stock.symbol} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          {stock.symbol}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={stock.name}>
                          {stock.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-foreground font-medium truncate max-w-[160px]">
                          {stock.sector}
                        </span>
                        <span
                          className={`inline-block text-[10px] px-1.5 py-0.5 rounded border w-fit font-medium ${getMarketCapBadge(
                            stock.marketCapCategory
                          )}`}
                        >
                          {stock.marketCapCategory}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-bold tabular-nums text-sm ${
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isPositive ? "+" : ""}₹{stock.netValueBoughtCr.toLocaleString()} Cr
                        </span>
                        {stock.netSharesChangePct !== 0 && (
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {stock.netSharesChangePct > 0 ? "+" : ""}
                            {stock.netSharesChangePct}% shares
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {stock.fundsBuyingCount} Buying
                        </span>
                        {stock.fundsSellingCount > 0 && (
                          <>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-rose-600 dark:text-rose-400 tabular-nums">
                              {stock.fundsSellingCount} Selling
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {stock.topBuyers.slice(0, 2).map((buyer) => (
                          <button
                            key={buyer.fundId}
                            onClick={() => onSelectFund?.(buyer.fundId)}
                            className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/50 truncate max-w-[130px] font-medium"
                            title={`${buyer.fundName}: +₹${buyer.valueAddedCr} Cr (Weight: ${buyer.currentWeightPct}%)`}
                          >
                            {buyer.fundName}
                          </button>
                        ))}
                        {stock.topBuyers.length > 2 && (
                          <span className="text-[11px] text-muted-foreground self-center px-1">
                            +{stock.topBuyers.length - 2} more
                          </span>
                        )}
                        {stock.topBuyers.length === 0 && stock.topSellers.length > 0 && (
                          <span className="text-xs text-rose-500 italic">
                            Trimmed by {stock.topSellers.map((s) => s.fundName).join(", ")}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {getTrendBadge(stock.trend)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setExpandedStock(isExpanded ? null : stock.symbol)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                      >
                        <span>{isExpanded ? "Hide" : "Drilldown"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredStocks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No mutual fund accumulation records found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Drilldown Drawer / Card when user clicks drilldown */}
      {expandedStock && (
        <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
          {(() => {
            const stock = stocks.find((s) => s.symbol === expandedStock);
            if (!stock) return null;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="space-y-0.5">
                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{stock.name} ({stock.symbol})</span>
                      <span className="text-xs text-muted-foreground font-normal">ISIN: {stock.isin}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Total Mutual Fund Holding: ₹{stock.totalInstitutionalAumCr.toLocaleString()} Cr across {stock.totalFundsHolding} schemes
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedStock(null)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded bg-card border border-border"
                  >
                    Close Drilldown
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Buyers list */}
                  <div className="p-3 rounded-lg bg-card border border-border/60 space-y-2">
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Mutual Funds Buying / Adding ({stock.topBuyers.length})
                    </div>
                    {stock.topBuyers.length > 0 ? (
                      <div className="space-y-1.5">
                        {stock.topBuyers.map((b) => (
                          <div key={b.fundId} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                            <div>
                              <button
                                onClick={() => onSelectFund?.(b.fundId)}
                                className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                              >
                                {b.fundName}
                              </button>
                              <div className="text-[10px] text-muted-foreground">
                                Fund Weight: {b.currentWeightPct}%
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                +₹{b.valueAddedCr} Cr
                              </span>
                              <div className="text-[10px] text-muted-foreground tabular-nums">
                                +{b.sharesAdded.toLocaleString()} shares
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No funds added shares this month.</p>
                    )}
                  </div>

                  {/* Sellers list */}
                  <div className="p-3 rounded-lg bg-card border border-border/60 space-y-2">
                    <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Mutual Funds Trimming / Exiting ({stock.topSellers.length})
                    </div>
                    {stock.topSellers.length > 0 ? (
                      <div className="space-y-1.5">
                        {stock.topSellers.map((s) => (
                          <div key={s.fundId} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                            <div>
                              <button
                                onClick={() => onSelectFund?.(s.fundId)}
                                className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                              >
                                {s.fundName}
                              </button>
                              <div className="text-[10px] text-muted-foreground">
                                Remaining Weight: {s.currentWeightPct}%
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                -₹{s.valueSoldCr} Cr
                              </span>
                              <div className="text-[10px] text-muted-foreground tabular-nums">
                                -{s.sharesSold.toLocaleString()} shares
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No funds trimmed this holding this month.</p>
                    )}
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
