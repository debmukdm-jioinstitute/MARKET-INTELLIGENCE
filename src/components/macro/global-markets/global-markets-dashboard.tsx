"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ComparisonModal } from "./comparison-modal";
import { HeroCard } from "./hero-card";
import { LowerCards } from "./lower-cards";
import { OverviewModal } from "./overview-modal";
import { TableCard } from "./table-card";
import type { GlobalMarketsTab, WorldIndexQuote } from "./types";
import { useIndexWatchlist } from "./use-index-watchlist";
import { cn } from "@/lib/utils";

const REGION_TABS: { id: GlobalMarketsTab; label: string }[] = [
  { id: "americas", label: "Americas" },
  { id: "europe", label: "Europe" },
  { id: "asia", label: "Asia Pacific" },
  { id: "india", label: "India" },
  { id: "volatility", label: "Volatility" },
];

interface GlobalMarketsDashboardProps {
  quotes: WorldIndexQuote[];
  fetchedAt?: string;
  loading: boolean;
  error?: string | null;
  onRefresh: () => void | Promise<unknown>;
  initialFocus?: string | null;
  onFocusChange?: (focus: string) => void;
}

export function GlobalMarketsDashboard({
  quotes,
  fetchedAt,
  loading,
  error,
  onRefresh,
  initialFocus,
  onFocusChange,
}: GlobalMarketsDashboardProps) {
  // Use isolated fixtures only if explicitly requested
  const allData = useMemo(() => {
    return quotes;
  }, [quotes]);

  // Selected region tab
  const validInitialTab: GlobalMarketsTab =
    initialFocus === "europe" ||
    initialFocus === "asia" ||
    initialFocus === "india" ||
    initialFocus === "volatility" ||
    initialFocus === "americas"
      ? initialFocus
      : "americas";

  const [activeTab, setActiveTab] = useState<GlobalMarketsTab>(validInitialTab);

  // Filter items by region tab
  const regionalQuotes = useMemo(() => {
    if (activeTab === "all") return allData;
    return allData.filter((q) => {
      if (activeTab === "americas") return q.focus === "americas";
      if (activeTab === "europe") return q.focus === "europe";
      if (activeTab === "asia") return q.focus === "asia";
      if (activeTab === "india") return q.focus === "india";
      if (activeTab === "volatility") return q.category === "volatility" || q.focus === "volatility";
      return true;
    });
  }, [activeTab, allData]);

  // Currently selected index for Hero and Lower Cards
  const [selectedId, setSelectedId] = useState<string>(() => {
    return regionalQuotes[0]?.id || allData[0]?.id || "spx";
  });

  // Whenever regional dataset changes, ensure selectedId is valid for this region
  useEffect(() => {
    if (!regionalQuotes.some((q) => q.id === selectedId)) {
      if (regionalQuotes.length > 0) {
        setSelectedId(regionalQuotes[0].id);
      }
    }
  }, [activeTab, regionalQuotes, selectedId]);

  // Selected quote object
  const selectedQuote = useMemo(() => {
    return allData.find((q) => q.id === selectedId) || regionalQuotes[0] || null;
  }, [allData, regionalQuotes, selectedId]);

  // Comparison set (independent from detail selection)
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  // Watchlist hook
  const { isWatchlisted, toggle: toggleWatchlist } = useIndexWatchlist();

  // Tab change handler
  const handleTabChange = (tab: GlobalMarketsTab) => {
    setActiveTab(tab);
    if (onFocusChange) onFocusChange(tab);
  };

  // Toggle compare checkbox
  const handleToggleCompare = useCallback((id: string) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Quotes in comparison
  const compareQuotes = useMemo(() => {
    return allData.filter((q) => compareSet.has(q.id));
  }, [allData, compareSet]);

  // Refresh coalescing
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // Freshness formatting
  const formattedFreshness = useMemo(() => {
    if (!fetchedAt) return "Live & closing quotes";
    try {
      const d = new Date(fetchedAt);
      return `Updated ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    } catch {
      return "Live & closing quotes";
    }
  }, [fetchedAt]);

  return (
    <div className="global-markets flex min-h-0 flex-1 flex-col gap-2 min-[1100px]:h-full min-[1100px]:max-h-full">
      {/* Top Header Row */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-0.5">
        {/* Left: Brand lockup and Global markets title */}
        <div className="flex items-center gap-2.5">
          <BrandLogo variant="lockup" size="sm" href="/macro" priority invertOnDark={false} />
          <h1 className="text-xl font-bold tracking-tight text-[#151515] sm:text-2xl lg:text-[24px] leading-tight">
            Global markets
          </h1>
        </div>

        {/* Center: Region Tabs */}
        <nav aria-label="Market regions" className="flex items-center gap-1.5">
          <div
            role="tablist"
            className="inline-flex flex-wrap rounded-full border-[1.5px] border-[#151515] bg-[#FCFCFA] p-0.5 shadow-2xs"
          >
            {REGION_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "rounded-full px-3.5 py-1 text-xs font-bold transition-all",
                    isSelected
                      ? "bg-[#151515] text-white"
                      : "text-[#151515] hover:bg-black/5",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right: Freshness and Refresh button */}
        <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col text-right text-[10px] text-[#62656B]">
              <span className="font-semibold text-[#151515]">{formattedFreshness}</span>
              <span className="text-[9px]">Delayed quotes · Last close</span>
            </div>

          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing || loading}
            aria-label="Refresh quotes"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#151515] bg-[#FCFCFA] px-2.5 py-1 text-xs font-bold text-[#151515] shadow-2xs transition-all hover:bg-[#F6F5F1] active:scale-95",
              (isRefreshing || loading) && "opacity-70",
            )}
          >
            <RefreshCw
              className={cn("size-3 stroke-[2.25]", (isRefreshing || loading) && "animate-spin")}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900"
        >
          {error}
        </div>
      ) : null}

      {/* Main Row: Coral/Mint/Ivory hero on left (~30%), Large table on right (~70%) */}
      <div className="main-bento min-h-[220px] flex-1 min-[1100px]:min-h-0">
        <HeroCard item={selectedQuote} className="h-full" />
        <TableCard
          items={regionalQuotes}
          selectedId={selectedId}
          onSelectIndex={(item) => setSelectedId(item.id)}
          compareSet={compareSet}
          onToggleCompare={handleToggleCompare}
          onOpenCompare={() => setIsCompareOpen(true)}
          isWatchlisted={isWatchlisted}
          onToggleWatchlist={toggleWatchlist}
          className="h-full"
        />
      </div>

      {/* Bottom Row: Three equal-height LIGHT cards (37% / 24% / 39%) */}
      <LowerCards
        item={selectedQuote}
        isWatchlisted={selectedQuote ? isWatchlisted(selectedQuote.id, selectedQuote.symbol) : false}
        onToggleWatchlist={() => {
          if (selectedQuote) {
            toggleWatchlist(selectedQuote.id, selectedQuote.symbol, selectedQuote.label);
          }
        }}
        onOpenOverview={() => setIsOverviewOpen(true)}
        className="shrink-0"
      />

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        items={compareQuotes}
        onRemoveItem={handleToggleCompare}
      />

      {/* Overview Modal */}
      <OverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        item={selectedQuote}
        isWatchlisted={selectedQuote ? isWatchlisted(selectedQuote.id, selectedQuote.symbol) : false}
        onToggleWatchlist={() => {
          if (selectedQuote) {
            toggleWatchlist(selectedQuote.id, selectedQuote.symbol, selectedQuote.label);
          }
        }}
      />
    </div>
  );
}
