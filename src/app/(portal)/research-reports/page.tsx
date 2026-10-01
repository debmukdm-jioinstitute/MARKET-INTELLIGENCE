"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AnalystCredibilityPanel } from "@/components/research/analyst-credibility-panel";
import { ResearchReportsGroupedFeed } from "@/components/research/research-reports-grouped-feed";
import type { ResearchReportRow } from "@/components/research/research-reports-table";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  ChevronDown,
  Download,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Radio,
  RefreshCw,
  Search,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Report = ResearchReportRow;

type BrokerCount = { broker: string; count: number };
type SourceStat = { key: string; label: string; count: number };

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export default function ResearchReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [brokers, setBrokers] = useState<BrokerCount[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pdfCount, setPdfCount] = useState<number>(0);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(null);
  const [dbConfigured, setDbConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filters
  const [filterTab, setFilterTab] = useState<"all" | "pdf" | "buy" | "upside">("all");
  const [activeBroker, setActiveBroker] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"freshness" | "upside" | "target" | "oldest">("freshness");
  const [query, setQuery] = useState("");
  const [showIntegrations, setShowIntegrations] = useState(false);

  const fetchReports = async (opts?: { sync?: boolean }) => {
    try {
      const params = new URLSearchParams();
      if (activeBroker) params.set("broker", activeBroker);
      if (activeSource) params.set("source", activeSource);
      if (query.trim()) params.set("q", query.trim());
      if (filterTab === "pdf") params.set("hasPdf", "1");
      if (filterTab === "buy") params.set("reco", "BUY");
      params.set("sort", sortBy);
      params.set("limit", "150");
      if (opts?.sync) params.set("sync", "1");

      const res = await fetch(`/api/research-reports?${params.toString()}`);
      const json = await res.json();
      setReports(json.reports ?? []);
      setBrokers(json.brokers ?? []);
      setSourceStats(json.sourceStats ?? []);
      setTotalCount(json.totalCount ?? json.reports?.length ?? 0);
      setPdfCount(json.pdfCount ?? json.reports?.filter((r: Report) => Boolean(r.pdf_url)).length ?? 0);
      setLastScrapedAt(json.lastScrapedAt ?? null);
      setDbConfigured(json.dbConfigured !== false);
    } catch {
      // Keep existing state on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchReports();
  }, [activeBroker, activeSource, query, filterTab, sortBy]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports({ sync: true });
  };

  const filteredReports = useMemo(() => {
    if (filterTab === "upside") {
      return reports.filter((r) => (r.upside_pct ?? 0) >= 15 || ((r.target_price && r.cmp) ? ((r.target_price - r.cmp) / r.cmp) * 100 >= 15 : false));
    }
    return reports;
  }, [reports, filterTab]);

  const topBrokers = useMemo(() => brokers.slice(0, 16), [brokers]);
  const visibleSourceStats = useMemo(
    () => sourceStats.filter((s) => s.count > 0).slice(0, 12),
    [sourceStats],
  );

  return (
    <div className="portal-page max-w-[1440px] pb-16 space-y-6">
      <PageHeader
        kicker="Institutional Research & Broker Intelligence Desk"
        title="Live Broker Research Reports & PDFs"
        subtitle="Live institutional equity research, quarterly result first-cuts, and target price forecasts—continuously ingested from Ventura Securities, Axis Direct, Trendlyne, ICICI Direct, Motilal Oswal, and exchange disclosures."
      />

      {/* TOP KPI TELEMETRY STRIP */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Reports Tracked</span>
            <FileText className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {totalCount ? totalCount.toLocaleString("en-IN") : reports.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Continuous auto-refresh across public feeds</p>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Live PDF Reports</span>
            <Download className="size-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {pdfCount}
          </p>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Instant one-click PDF documents</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Research Houses</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {brokers.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Institutional brokers & SEBI RAs</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Feed Freshness</span>
            <Radio className="size-4 text-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {timeAgo(lastScrapedAt)}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              title="Trigger background refresh"
            >
              <RefreshCw className={cn("size-3", refreshing && "animate-spin text-primary")} />
              Sync
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastScrapedAt ? `As of ${new Date(lastScrapedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} IST` : "Active stream"}
          </p>
        </div>
      </div>

      {!dbConfigured ? (
        <div className="rounded-xl border border-blue-600/30 bg-blue-600/5 p-3.5 text-sm text-blue-600">
          Serving reports directly from live public endpoints. Setting DATABASE_URL enables long-term historical report archiving.
        </div>
      ) : null}

      {/* ANALYST TRACK RECORD & CREDIBILITY SCORECARD */}
      <AnalystCredibilityPanel />

      {/* APIFY & ZAPIER INGESTION COLLAPSIBLE DRAWER */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Zap className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                Apify & Zapier Live Scraper Ingestion
              </p>
              <p className="text-xs text-muted-foreground">
                Feed external PDF scrapers, crawler webhooks, or Google Drive reports into this desk via REST API.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIntegrations(!showIntegrations)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
          >
            {showIntegrations ? "Hide Ingest Guide" : "Ingest Webhook API"}
            <ChevronDown className={cn("size-3.5 transition-transform", showIntegrations && "rotate-180")} />
          </button>
        </div>

        {showIntegrations ? (
          <div className="mt-4 border-t border-primary/20 pt-4 text-xs space-y-2.5 text-muted-foreground">
            <p>
              You can connect any custom scraper (<strong>Apify Actor</strong>, <strong>Zapier Webhook</strong>, Make.com, or Python/Playwright script) to stream research PDFs into this repository.
            </p>
            <div className="rounded-lg bg-card/80 p-3 text-xs leading-relaxed text-foreground border border-border">
              <p className="text-muted-foreground"># POST Endpoint</p>
              <p className="text-primary font-bold">POST https://getmarketintelligence.in/api/research-reports/ingest</p>
              <p className="mt-1 text-muted-foreground"># Headers</p>
              <p>Authorization: Bearer &lt;CRON_SECRET | SCANNER_INGEST_SECRET&gt;</p>
              <p className="mt-1 text-muted-foreground"># Sample JSON Payload</p>
              <p className="text-emerald-600 dark:text-emerald-400">
                {`{
  "reports": [{
    "source": "apify_custom",
    "broker": "Motilal Oswal",
    "symbol": "TCS",
    "title": "TCS - Robust IT Deal Wins and Margin Resilience",
    "url": "https://example.com/reports/tcs-q2.pdf",
    "pdfUrl": "https://example.com/reports/tcs-q2.pdf",
    "recommendation": "BUY",
    "targetPrice": 4650,
    "cmp": 3950,
    "reportType": "Result Update",
    "publishedAt": "2026-09-28T09:00:00Z"
  }]
}`}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* FILTER TABS & SEARCH CONTROLS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                filterTab === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-accent/40 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              All Reports ({totalCount || reports.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("pdf")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                filterTab === "pdf"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
              )}
            >
              <Download className="size-3.5" />
              Direct PDF Reports Only ({pdfCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("buy")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                filterTab === "buy"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
              )}
            >
              🟢 Buy & Strong Buy
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("upside")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                filterTab === "upside"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-accent/40 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              🚀 Top Upside Potential (&gt;15%)
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ticker, company, broker..."
                className="w-full rounded-lg border border-border bg-accent/20 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium",
                  viewMode === "cards"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
                title="Card view"
              >
                <LayoutGrid className="size-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium",
                  viewMode === "table"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
                title="Table view"
              >
                <List className="size-3.5" />
                Table
              </button>
              <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary"
              >
                <option value="freshness">Sort: Freshness (Newest)</option>
                <option value="upside">Sort: Highest Upside %</option>
                <option value="target">Sort: Target Price (High to Low)</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* BROKER CAROUSEL / FILTER CHIPS */}
        {topBrokers.length > 0 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveBroker(null)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeBroker === null
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-accent/30 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              ALL BROKERS
            </button>
            {topBrokers.map((b) => (
              <button
                key={b.broker}
                type="button"
                onClick={() => setActiveBroker(b.broker === activeBroker ? null : b.broker)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeBroker === b.broker
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-accent/30 text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {b.broker} <span className="opacity-60 text-[11px]">({b.count})</span>
              </button>
            ))}
          </div>
        ) : null}

        {visibleSourceStats.length > 0 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="size-3.5 shrink-0 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setActiveSource(null)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeSource === null
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-accent/30 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              ALL SOURCES
            </button>
            {visibleSourceStats.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSource(s.key === activeSource ? null : s.key)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeSource === s.key
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-accent/30 text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {s.label} <span className="opacity-60 text-[11px]">({s.count})</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ResearchReportsGroupedFeed rows={filteredReports} loading={loading} viewMode={viewMode} />
    </div>
  );
}
