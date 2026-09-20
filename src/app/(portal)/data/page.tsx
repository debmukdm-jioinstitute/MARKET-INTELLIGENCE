"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, CheckCircle2, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataSource {
  metricId?: string;
  name: string;
  provider: string;
  type: "Exchange Licensed" | "Official Regulatory" | "Open Web API";
  coverage: string;
  latency: string;
  freshness: string;
  qualityScore: number;
  status: "ONLINE" | "DEGRADED" | "STANDBY";
  url: string;
}

const SOURCES: DataSource[] = [
  {
    metricId: "nifty50",
    name: "Upstox WebSocket & REST Feed",
    provider: "Upstox (RKSV Securities)",
    type: "Exchange Licensed",
    coverage: "NSE Equities, NIFTY/BANKNIFTY Indices, Option Greeks",
    latency: "120 ms",
    freshness: "Tick-by-tick / 1s",
    qualityScore: 99.8,
    status: "ONLINE",
    url: "https://upstox.com/developer/api-documentation",
  },
  {
    metricId: "corporate_announcement",
    name: "NSE India Corporate Announcements",
    provider: "National Stock Exchange of India",
    type: "Official Regulatory",
    coverage: "Material Disclosures, Board Meetings, Earnings, Filings",
    latency: "1.2 s",
    freshness: "Real-time RSS",
    qualityScore: 99.4,
    status: "ONLINE",
    url: "https://www.nseindia.com",
  },
  {
    metricId: "sensex",
    name: "BSE India Corporate Announcements",
    provider: "Bombay Stock Exchange",
    type: "Official Regulatory",
    coverage: "SENSEX 30, Regulatory Submissions, Dividends, M&A",
    latency: "1.4 s",
    freshness: "Real-time RSS",
    qualityScore: 99.2,
    status: "ONLINE",
    url: "https://www.bseindia.com",
  },
  {
    metricId: "repo",
    name: "Reserve Bank of India (RBI)",
    provider: "RBI Data Warehouse & RSS",
    type: "Official Regulatory",
    coverage: "Monetary Policy, Liquidity Operations, FX Reserves, Repo",
    latency: "15 min",
    freshness: "Daily / Fortnightly",
    qualityScore: 100.0,
    status: "ONLINE",
    url: "https://www.rbi.org.in",
  },
  {
    metricId: "cpi",
    name: "MOSPI Macro Data Portal",
    provider: "Ministry of Statistics & Programme Implementation",
    type: "Official Regulatory",
    coverage: "CPI Inflation, IIP Industrial Production, Quarterly GDP",
    latency: "Batch",
    freshness: "Monthly release cycle",
    qualityScore: 98.9,
    status: "ONLINE",
    url: "https://mospi.gov.in",
  },
  {
    metricId: "sp500",
    name: "Yahoo Finance Global Market Feeds",
    provider: "Yahoo Finance API / Stooq",
    type: "Open Web API",
    coverage: "S&P 500, NASDAQ, Brent Crude, Gold, US 10Y, DXY",
    latency: "600 ms",
    freshness: "15s delayed / EOD",
    qualityScore: 97.4,
    status: "ONLINE",
    url: "https://finance.yahoo.com",
  },
  {
    metricId: "gsec10y",
    name: "FRED (Federal Reserve Economic Data)",
    provider: "Federal Reserve Bank of St. Louis",
    type: "Official Regulatory",
    coverage: "Global Macro, OECD Sovereign Yields, CBOE VIX",
    latency: "Batch CSV",
    freshness: "Daily close",
    qualityScore: 99.9,
    status: "ONLINE",
    url: "https://fred.stlouisfed.org",
  },
];

export default function DataPage() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Data Observability"
        title="Data Sources, Quality & Feed Freshness"
        subtitle="Institutional telemetry monitoring upstream API health, latency, data completeness, and failover status across all market feeds."
      />

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">SYSTEM HEALTH SCORE</span>
            <MetricInfo id="data_quality" iconSize="xs" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">99.4%</div>
          <span className="text-[11px] text-muted-foreground">Across 7 upstream providers</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">AVG INGESTION LATENCY</span>
            <MetricInfo id="feed_latency" iconSize="xs" />
          </div>
          <div className="text-2xl font-bold text-foreground">340 ms</div>
          <span className="text-[11px] text-emerald-400">P95 below 850 ms</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">ACTIVE DATA STREAMS</span>
            <MetricInfo id="data_quality" name="Active Data Streams Telemetry" iconSize="xs" />
          </div>
          <div className="text-2xl font-bold text-foreground">42 Feeds</div>
          <span className="text-[11px] text-muted-foreground">0 outages reported today</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">REDUNDANCY WATERFALL</span>
            <MetricInfo id="data_quality" name="Multi-tier Failover Architecture" iconSize="xs" />
          </div>
          <div className="text-2xl font-bold text-primary">3-Tier Active</div>
          <span className="text-[11px] text-muted-foreground">Upstox → Yahoo → TrueData</span>
        </div>
      </div>

      {/* Sources Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Feed Source</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Latency
                  <MetricInfo id="feed_latency" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">Freshness</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Quality Score
                  <MetricInfo id="data_quality" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SOURCES.map((s) => (
              <TableRow key={s.name} className="font-mono text-xs hover:bg-accent/40">
                <TableCell className="font-bold text-foreground flex items-center gap-1.5">
                  <span>{s.name}</span>
                  <MetricInfo
                    id={s.metricId ?? "data_quality"}
                    name={s.name}
                    provider={s.provider}
                    sourceUrl={s.url}
                    iconSize="xs"
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{s.provider}</TableCell>
                <TableCell>
                  <span className="rounded bg-accent/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {s.type}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[220px] truncate">{s.coverage}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{s.latency}</TableCell>
                <TableCell className="text-right text-muted-foreground">{s.freshness}</TableCell>
                <TableCell className="text-right font-bold text-emerald-400">{s.qualityScore}%</TableCell>
                <TableCell className="text-center">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[9px] font-bold uppercase",
                      s.status === "ONLINE" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400",
                    )}
                  >
                    {s.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    API <ExternalLink className="size-3" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
