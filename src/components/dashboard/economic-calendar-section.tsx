"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
import { Calendar, Clock, Globe, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  metricId: string;
  date: string;
  country: "IND" | "USA";
  event: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  actual: string;
  forecast: string;
  previous: string;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    metricId: "repo",
    date: "Sep 22, 11:00",
    country: "IND",
    event: "RBI MPC Rate Decision & Stance Resolution",
    impact: "HIGH",
    actual: "5.25%",
    forecast: "5.25%",
    previous: "5.25%",
  },
  {
    metricId: "cpi",
    date: "Sep 24, 17:30",
    country: "IND",
    event: "CPI Inflation Rate YoY (Aug)",
    impact: "HIGH",
    actual: "4.2%",
    forecast: "4.3%",
    previous: "3.6%",
  },
  {
    metricId: "gdp",
    date: "Sep 26, 18:00",
    country: "USA",
    event: "US GDP Growth Rate Annualized QoQ",
    impact: "HIGH",
    actual: "3.0%",
    forecast: "2.9%",
    previous: "2.8%",
  },
  {
    metricId: "liquidity",
    date: "Sep 28, 17:00",
    country: "IND",
    event: "Fiscal Deficit (INR)",
    impact: "MEDIUM",
    actual: "₹4.82 L Cr",
    forecast: "₹4.90 L Cr",
    previous: "₹4.60 L Cr",
  },
  {
    metricId: "cpi",
    date: "Sep 30, 18:30",
    country: "USA",
    event: "Core PCE Price Index MoM",
    impact: "HIGH",
    actual: "—",
    forecast: "0.2%",
    previous: "0.2%",
  },
];

export function EconomicCalendarSection() {
  const [regionFilter, setRegionFilter] = useState<"ALL" | "IND" | "USA">("ALL");
  const [impactFilter, setImpactFilter] = useState<"ALL" | "HIGH">("ALL");

  const filteredEvents = CALENDAR_EVENTS.filter((e) => {
    if (regionFilter !== "ALL" && e.country !== regionFilter) return false;
    if (impactFilter === "HIGH" && e.impact !== "HIGH") return false;
    return true;
  });

  return (
    <section id="calendar" className="scroll-mt-6 space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header Strip */}
        <div className="border-b border-border/80 p-5 bg-card/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary">
                Macro Schedule
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Economic Calendar & Sovereign Releases
            </h2>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Schedule of critical central bank decisions, inflation prints, employment reports, and GDP releases impacting asset pricing.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setRegionFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  regionFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Regions
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter("IND")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  regionFilter === "IND"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                India (IND)
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter("USA")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  regionFilter === "USA"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                US (USA)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setImpactFilter((prev) => (prev === "ALL" ? "HIGH" : "ALL"))}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors",
                impactFilter === "HIGH"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600 font-semibold"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <Filter className="h-3 w-3" />
              <span>{impactFilter === "HIGH" ? "High Impact Only" : "All Impact"}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/20">
                <TableHead className="w-[180px]">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Date / Time (IST)
                  </span>
                </TableHead>
                <TableHead className="w-[100px]">Region</TableHead>
                <TableHead>Economic Event</TableHead>
                <TableHead className="w-[110px] text-center">Impact</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    Actual
                    <MetricInfo id="cpi" name="Actual Reported Print" iconSize="xs" />
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    Consensus Forecast
                    <MetricInfo id="cpi" name="Economist Consensus Forecast" iconSize="xs" />
                  </span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    Previous
                    <MetricInfo id="cpi" name="Previous Period Benchmark" iconSize="xs" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    No releases found matching the selected filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((e, idx) => (
                  <TableRow key={idx} className="text-sm hover:bg-accent/40 transition-colors">
                    <TableCell className="font-medium text-foreground whitespace-nowrap">
                      {e.date}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border",
                          e.country === "IND"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        )}
                      >
                        {e.country}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span>{e.event}</span>
                        <MetricInfo id={e.metricId} name={e.event} iconSize="xs" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-block rounded px-2 py-0.5 text-[10px] font-bold border",
                          e.impact === "HIGH"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            : e.impact === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-blue-600/10 text-blue-600 border-blue-600/20"
                        )}
                      >
                        {e.impact}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground tabular-nums">
                      {e.actual}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {e.forecast}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {e.previous}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Info Strip */}
        <div className="border-t border-border px-5 py-3 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>Sources: RBI MPC, MOSPI (India), US BEA, US Bureau of Labor Statistics.</span>
          </div>
          <div>All timestamps calibrated to Indian Standard Time (IST).</div>
        </div>
      </div>
    </section>
  );
}
