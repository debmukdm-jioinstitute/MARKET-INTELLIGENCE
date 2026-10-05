"use client";

import { PageHeader } from "@/components/layout/page-header";
import { OffersHubLinks, OffersTable } from "@/components/offers/offers-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOffersReport } from "@/hooks/use-offers-report";
import type { OfferCategory } from "@/lib/feeds/offers/types";
import { cn } from "@/lib/utils";
import { AlertCircle, Pause, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

const TABS: { value: OfferCategory; label: string; badge?: string }[] = [
  { value: "ncd", label: "NCD issues" },
  { value: "rights", label: "Rights issues" },
  { value: "buyback", label: "Buybacks" },
  { value: "ofs", label: "Offer for sale (OFS)" },
  { value: "ncd-subscription", label: "NCD sub (live)", badge: "LIVE" },
];

const AVAILABLE_YEARS = [2026, 2025, 2024];

function useRelativeTime(date: Date | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  if (!date) return "Not synced yet";
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function OffersPageClient() {
  const [category, setCategory] = useState<OfferCategory>("ncd");
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { report, loading, isValidating, error, refresh, lastUpdated, intervalMs } =
    useOffersReport(category, year, { autoRefresh });

  const relativeTime = useRelativeTime(lastUpdated);

  return (
    <div className="portal-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader

          title="NCD · Rights · Buyback · OFS"
          subtitle="Live primary market calendars scraped from Chittorgarh report API — NCD issues, rights issues, tender buybacks, OFS, and real-time subscription bidding."
        />

        {/* Global Live Data Sync Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start rounded-xl border border-border/70 bg-card/70 p-1.5 text-xs shadow-sm backdrop-blur-sm sm:self-auto">
          {/* Live Polling Status Pill */}
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors",
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-muted text-muted-foreground",
            )}
            title={
              autoRefresh
                ? `Polling fresh data every ${intervalMs / 1000} seconds`
                : "Auto-refresh is currently paused"
            }
          >
            {autoRefresh ? (
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            ) : (
              <span className="size-2 rounded-full bg-muted-foreground/60" />
            )}
            <span>
              {autoRefresh
                ? category === "ncd-subscription"
                  ? "Live sync (30s)"
                  : "Live sync (60s)"
                : "Sync paused"}
            </span>
          </div>

          {/* Last Updated Timestamp */}
          <span className="hidden text-muted-foreground sm:inline-block">
            Updated <span className="font-semibold text-foreground">{relativeTime}</span>
          </span>

          {/* Pull Fresh Data (Manual Trigger) */}
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={isValidating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1 font-medium text-foreground transition-all hover:bg-accent active:scale-95 disabled:opacity-50 touch-manipulation"
            title="Force immediate refresh bypassing server & browser caches"
          >
            <RefreshCw className={cn("size-3.5", isValidating && "animate-spin text-primary")} />
            <span>{isValidating ? "Pulling fresh..." : "Pull fresh data"}</span>
          </button>

          {/* Toggle Auto-Refresh */}
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className="inline-flex size-7 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground touch-manipulation"
            title={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
            aria-label={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
          >
            {autoRefresh ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>

          {/* Year Filter Pill Selector */}
          <div className="flex items-center gap-0.5 border-l border-border/60 pl-2">
            {AVAILABLE_YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors touch-manipulation",
                  year === y
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error notification if upstream feed is unavailable */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>Could not pull latest updates: {error}</span>
          </div>
          <button
            type="button"
            onClick={() => void refresh(true)}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry now
          </button>
        </div>
      )}

      {/* Tabs with Live Badges */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as OfferCategory)}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="relative">
              {t.label}
              {t.badge && (
                <span className="ml-1.5 rounded-sm bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  {t.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <OffersTable
              report={category === t.value ? report : undefined}
              loading={loading && category === t.value}
              isValidating={isValidating && category === t.value}
              onRefresh={() => void refresh(true)}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-6">
        <OffersHubLinks />
      </div>
    </div>
  );
}
