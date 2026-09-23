"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
import { Calendar, Clock, Globe } from "lucide-react";

interface CalendarEvent {
  metricId: string;
  date: string;
  country: string;
  event: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  actual: string;
  forecast: string;
  previous: string;
}

const EVENTS: CalendarEvent[] = [
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

export default function EconomicCalendarPage() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Macro Schedule"
        title="Economic Calendar & Sovereign Releases"
        subtitle="Schedule of critical central bank decisions, inflation prints, employment reports, and GDP releases impacting asset pricing."
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date / Time (IST)</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Economic Event</TableHead>
              <TableHead className="text-center">Impact</TableHead>
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
            {EVENTS.map((e, idx) => (
              <TableRow key={idx} className="text-sm hover:bg-accent/40">
                <TableCell className="font-medium text-foreground">{e.date}</TableCell>
                <TableCell className="font-bold text-primary">{e.country}</TableCell>
                <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>{e.event}</span>
                  <MetricInfo id={e.metricId} name={e.event} iconSize="xs" />
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={
                      e.impact === "HIGH"
                        ? "rounded bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-600"
                        : "rounded bg-blue-600/10 px-2 py-0.5 text-[9px] font-bold text-blue-600"
                    }
                  >
                    {e.impact}
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold text-foreground">{e.actual}</TableCell>
                <TableCell className="text-right text-muted-foreground">{e.forecast}</TableCell>
                <TableCell className="text-right text-muted-foreground">{e.previous}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
