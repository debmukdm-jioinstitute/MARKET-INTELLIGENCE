"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricInfo } from "@/components/ui/metric-info";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EconomicCalendarPayload, EventRegion } from "@/lib/macro/economic-calendar";
import { cn } from "@/lib/utils";
import { Activity, ArrowUpRight, CheckCircle2, Clock, Filter, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

/** Module-level fetcher — never inline an async function inside useSWR (React #185). */
async function fetchCalendar(url: string): Promise<EconomicCalendarPayload> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Economic calendar feed HTTP ${res.status}`);
  }
  return res.json();
}

export function EconomicCalendarSection() {
  const [selectedRegion, setSelectedRegion] = useState<EventRegion | "all">("all");
  const [highImpactOnly, setHighImpactOnly] = useState<boolean>(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);

  // SWR automatically polls every 60 seconds and revalidates on window focus
  const { data, error, isLoading, mutate } = useSWR<EconomicCalendarPayload>(
    "/api/macro/calendar",
    fetchCalendar,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
    }
  );

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await mutate();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    let list = data.events;
    if (selectedRegion !== "all") {
      list = list.filter((e) => e.region === selectedRegion);
    }
    if (highImpactOnly) {
      list = list.filter((e) => e.impact === "HIGH");
    }
    return list;
  }, [data?.events, selectedRegion, highImpactOnly]);

  const lastUpdatedText = data?.fetchedAt
    ? (() => {
        try {
          return new Date(data.fetchedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <section id="calendar" className="scroll-mt-24 space-y-4" aria-labelledby="economic-calendar-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="economic-calendar-heading" className="font-heading text-lg font-bold text-foreground">
              Economic calendar & sovereign releases
            </h2>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Central bank decisions, inflation prints, and GDP releases that can move the book.
          </p>
        </div>

        {/* Live sync pill & manual trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <Activity className="h-3 w-3 animate-pulse" />
            <span>LIVE FEED · Auto-syncs every 60s</span>
            {lastUpdatedText ? (
              <span className="text-[11px] opacity-75">({lastUpdatedText} IST)</span>
            ) : null}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isManualRefreshing || isLoading}
            className="h-7 gap-1.5 text-xs font-medium"
            title="Refresh feed now"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isManualRefreshing && "animate-spin")} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedRegion("all")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              selectedRegion === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Regions ({data?.counts?.total ?? "—"})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRegion("IND")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              selectedRegion === "IND"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            India Sovereign ({data?.counts?.india ?? "—"})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRegion("USA")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              selectedRegion === "USA"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            United States ({data?.counts?.usa ?? "—"})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRegion("GLOBAL")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              selectedRegion === "GLOBAL"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Global Central Banks ({data?.counts?.global ?? "—"})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setHighImpactOnly((prev) => !prev)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
            highImpactOnly
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Filter className="h-3 w-3" />
          <span>High Impact Only</span>
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          Failed to sync latest economic calendar: {error.message}. Displaying cached schedule.
        </div>
      ) : null}

      <div className="bento-card-shell overflow-hidden p-0 sm:p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Date / Time (IST)</TableHead>
              <TableHead className="w-[80px]">Region</TableHead>
              <TableHead>Economic Event</TableHead>
              <TableHead className="w-[100px] text-center">Impact</TableHead>
              <TableHead className="w-[110px] text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Actual
                  <MetricInfo id="cpi" name="Actual Reported Print" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="w-[130px] text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Consensus Forecast
                  <MetricInfo id="cpi" name="Economist Consensus Forecast" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="w-[110px] text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Previous
                  <MetricInfo id="cpi" name="Previous Period Benchmark" iconSize="xs" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !data ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                    <span>Syncing latest central bank releases and sovereign calendar…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  No sovereign events match the active filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((e) => {
                const isReported = e.status === "reported";
                const isToday = e.status === "today";

                return (
                  <TableRow
                    key={e.id}
                    className={cn(
                      "text-sm transition-colors hover:bg-accent/40",
                      isToday && "bg-primary/5 font-medium"
                    )}
                  >
                    {/* Date / Time */}
                    <TableCell className="font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isReported ? (
                          <span title="Reported release"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /></span>
                        ) : isToday ? (
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
                          </span>
                        ) : (
                          <span title="Upcoming release"><Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" /></span>
                        )}
                        <span>{e.date}</span>
                      </div>
                    </TableCell>

                    {/* Region */}
                    <TableCell className="font-bold whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-xs font-bold",
                          e.country === "IND"
                            ? "bg-primary/10 text-primary"
                            : e.country === "USA"
                            ? "bg-blue-600/10 text-blue-600 dark:text-blue-400"
                            : "bg-purple-600/10 text-purple-600 dark:text-purple-400"
                        )}
                      >
                        {e.country}
                      </span>
                    </TableCell>

                    {/* Event Title + Source Link */}
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {e.sourceUrl ? (
                          <a
                            href={e.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary hover:underline inline-flex items-center gap-1"
                            title={`Official release source: ${e.source}`}
                          >
                            <span>{e.event}</span>
                            <ArrowUpRight className="h-3 w-3 opacity-60 hover:opacity-100" />
                          </a>
                        ) : (
                          <span>{e.event}</span>
                        )}
                        <MetricInfo id={e.metricId} name={e.event} iconSize="xs" />
                      </div>
                      <p className="text-[11px] font-normal text-muted-foreground line-clamp-1">
                        {e.source} · {e.description}
                      </p>
                    </TableCell>

                    {/* Impact Level */}
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[9px] font-bold tracking-wider",
                          e.impact === "HIGH"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        )}
                      >
                        {e.impact}
                      </span>
                    </TableCell>

                    {/* Actual */}
                    <TableCell
                      className={cn(
                        "text-right font-bold tabular-nums",
                        isReported
                          ? "text-foreground"
                          : isToday
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {e.actual}
                    </TableCell>

                    {/* Forecast */}
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {e.forecast}
                    </TableCell>

                    {/* Previous */}
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {e.previous}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
