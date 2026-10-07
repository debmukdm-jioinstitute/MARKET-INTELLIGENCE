"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ComparisonModal } from "./comparison-modal";
import { REFERENCE_SNAPSHOT_FIXTURES } from "./fixtures";
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
  isFixtureMode?: boolean;
}

export function GlobalMarketsDashboard({
  quotes,
  fetchedAt,
  loading,
  error,
  onRefresh,
  initialFocus,
  onFocusChange,
  isFixtureMode = false,
}: GlobalMarketsDashboardProps) {
  // Use isolated fixtures only if explicitly requested
  const allData = useMemo(() => {
    if (isFixtureMode) return REFERENCE_SNAPSHOT_FIXTURES;
    return quotes;
  }, [isFixtureMode, quotes]);

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
    <div className="global-markets">
      {/* Top Header Row */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-2">
        {/* Official logo lockup */}
        <div className="flex items-center">
          <BrandLogo variant="lockup" size="md" href="/macro" priority invertOnDark={false} />
        </div>

        {/* Refresh control and honest data freshness status */}
        <div className="flex flex-wrap items-center gap-3">
          {isFixtureMode ? (
            <span
              role="status"
              className="rounded-full border border-[#151515]/20 bg-[#FCFCFA] px-3 py-1 text-xs font-semibold text-[#151515]"
            >
              Sample snapshot · not live
            </span>
          ) : (
            <div className="flex flex-col text-right text-xs text-[#62656B]">
              <span className="font-semibold text-[#151515]">{formattedFreshness}</span>
              <span className="text-[11px]">Delayed quotes · Closed markets show last close</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing || loading}
            aria-label="Refresh quotes"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#151515] bg-[#FCFCFA] px-4 py-2 text-sm font-bold text-[#151515] shadow-2xs transition-all hover:bg-[#F6F5F1] active:scale-95",
              (isRefreshing || loading) && "opacity-70",
            )}
          >
            <RefreshCw
              className={cn("size-4 stroke-[2.25]", (isRefreshing || loading) && "animate-spin")}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Title: 60-68px desktop, weight 700, line-height 1.05 */}
      <h1 className="my-4 text-[36px] font-bold leading-[1.05] tracking-tight text-[#151515] sm:my-6 sm:text-[48px] lg:text-[64px]">
        Global markets
      </h1>

      {/* Region Tabs */}
      <nav aria-label="Market regions" className="mb-6 flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          className="inline-flex flex-wrap rounded-full border-[1.5px] border-[#151515] bg-[#FCFCFA] p-1 shadow-2xs"
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
                  "rounded-full px-5 py-2 text-sm font-bold transition-all",
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

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"
        >
          {error}
        </div>
      ) : null}

      {/* Main Row: Coral hero on left (~30%), Large table on right (~70%) */}
      <div className="main-bento">
        <HeroCard item={selectedQuote} className="h-full min-h-[460px]" />
        <TableCard
          items={regionalQuotes}
          selectedId={selectedId}
          onSelectIndex={(item) => setSelectedId(item.id)}
          compareSet={compareSet}
          onToggleCompare={handleToggleCompare}
          onOpenCompare={() => setIsCompareOpen(true)}
          isWatchlisted={isWatchlisted}
          onToggleWatchlist={toggleWatchlist}
          className="h-full min-h-[460px]"
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
        className="mt-3"
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
