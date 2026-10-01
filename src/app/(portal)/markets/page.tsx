"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { formatPct } from "@/lib/format";
import { ALL_UNIVERSE } from "@/lib/universe";
import { cn } from "@/lib/utils";
import { ArrowUpRight, CheckCircle2, RefreshCw, Search, ShieldAlert, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FilterTab = "all" | "global" | "india";

function formatCurrencyPrice(val: number, currency?: string): string {
  const isINR = currency === "INR";
  const symbol = isINR ? "₹" : "$";
  return `${symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPointChange(val: number, currency?: string): string {
  const isINR = currency === "INR";
  const prefix = isINR ? "₹" : "$";
  const sign = val > 0 ? "+" : val < 0 ? "-" : "";
  return `${sign}${prefix}${Math.abs(val).toFixed(2)}`;
}

export default function MarketsPage() {
  const router = useRouter();
  const { data, loading, hubSyncedAt, reload } = useFeedHub(60_000);
  const live = quoteMap(data);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const rows = useMemo(() => {
    return ALL_UNIVERSE.map((u) => {
      // Look up quote by exact symbol, with .NS suffix, or without .NS suffix
      const q =
        live.get(u.symbol) ??
        live.get(`${u.symbol}.NS`) ??
        live.get(u.symbol.replace(/\.NS$/, ""));

      // Strict institutional integrity: NEVER substitute seeded random numbers for live prices
      const isAvailable = Boolean(q && typeof q.price === "number" && q.price > 0);
      const isLive = Boolean(isAvailable && !q?.stale);
      const isDelayed = Boolean(isAvailable && q?.stale);

      const last = isAvailable ? q!.price : null;
      const change = isAvailable && typeof q!.change === "number" ? q!.change : null;
      const d1 = isAvailable && typeof q!.changePct === "number" ? q!.changePct : null;

      const isIndian = u.region === "EM" || u.symbol.endsWith(".NS");
      const currency = isIndian ? "INR" : "USD";
      const sourceProvider = q?.provider
        ? `${q.provider.toUpperCase()} Official Feed`
        : isIndian
        ? "Upstox / NSE Official"
        : "Yahoo Finance / Stooq";

      const sourceUrl = isIndian
        ? `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(u.symbol.replace(/\.NS$/, ""))}`
        : `https://finance.yahoo.com/quote/${encodeURIComponent(u.symbol)}`;

      return {
        ...u,
        isIndian,
        currency,
        last,
        change,
        d1,
        isAvailable,
        isLive,
        isDelayed,
        asOf: q?.asOf ?? hubSyncedAt,
        sourceProvider,
        sourceUrl,
      };
    });
  }, [live, hubSyncedAt]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (activeTab === "global" && r.isIndian) return false;
      if (activeTab === "india" && !r.isIndian) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSymbol = r.symbol.toLowerCase().includes(query);
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesSector = (r.sector || "").toLowerCase().includes(query);
        if (!matchesSymbol && !matchesName && !matchesSector) return false;
      }
      return true;
    });
  }, [rows, activeTab, searchQuery]);

  const liveCount = useMemo(() => rows.filter((r) => r.isLive).length, [rows]);
  const delayedCount = useMemo(() => rows.filter((r) => r.isDelayed).length, [rows]);
  const unavailCount = useMemo(() => rows.filter((r) => !r.isAvailable).length, [rows]);

  return (
    <div className="portal-page space-y-6">
      <PageHeader
        kicker="Market data"
        title="Investable universe"
        subtitle="Institutional market quotes streamed directly from Yahoo Finance, Stooq, and Upstox official exchange feeds. Click a row for research dossier, or ⓘ for source provenance."
      />

      {/* Institutional Data Integrity Strip */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  liveCount > 0 ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full size-2.5",
                  liveCount > 0 ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
            </span>
            <span className="font-semibold text-foreground">
              {loading && !data ? "Connecting to feed hub…" : "Feed status: Active"}
            </span>
          </div>

          <span className="text-muted-foreground">·</span>

          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
            <CheckCircle2 className="size-3.5" />
            {liveCount} Live quotes
          </span>

          {delayedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">
              {delayedCount} Delayed
            </span>
          ) : null}

          {unavailCount > 0 && !loading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded">
              <ShieldAlert className="size-3.5 text-muted-foreground" />
              {unavailCount} Offline (prices hidden)
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {hubSyncedAt ? (
            <span className="flex items-center gap-1">
              <Wifi className="size-3 text-primary" />
              Sync {new Date(hubSyncedAt).toLocaleTimeString()}
              <MetricInfo id="data_quality" asOf={hubSyncedAt} iconSize="xs" />
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => reload()}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold hover:bg-accent text-foreground transition-colors"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs and Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-md font-semibold text-xs transition-colors",
              activeTab === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            All Instruments ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("global")}
            className={cn(
              "px-3 py-1.5 rounded-md font-semibold text-xs transition-colors",
              activeTab === "global" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            US & Global Benchmarks ({rows.filter((r) => !r.isIndian).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("india")}
            className={cn(
              "px-3 py-1.5 rounded-md font-semibold text-xs transition-colors",
              activeTab === "india" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            India NSE Equities ({rows.filter((r) => r.isIndian).length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbol, name, sector…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Symbol</TableHead>
              <TableHead>Instrument Name</TableHead>
              <TableHead className="hidden md:table-cell">Asset Class</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Last Traded Price
                  <MetricInfo id="nav" name="Last Traded Price" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Point Change
                  <MetricInfo id="today_pnl" name="Point Change" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  1D % Return
                  <MetricInfo id="today_pnl" name="1-Day Percentage Return" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-center hidden sm:table-cell">Data Source</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow
                key={row.symbol}
                className="group cursor-pointer hover:bg-accent/40"
                onClick={() => router.push(`/research/${encodeURIComponent(row.symbol)}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground group-hover:text-primary group-hover:underline underline-offset-2">
                      {row.symbol}
                    </span>

                    {/* Status Badges */}
                    {row.isLive ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 uppercase">
                        LIVE
                      </span>
                    ) : row.isDelayed ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 uppercase">
                        DELAYED
                      </span>
                    ) : loading && !data ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase animate-pulse">
                        SYNCING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 uppercase">
                        OFFLINE
                      </span>
                    )}

                    <span onClick={(e) => e.stopPropagation()}>
                      <MetricInfo
                        id={row.symbol.toLowerCase()}
                        name={`${row.name} (${row.symbol})`}
                        provider={row.sourceProvider}
                        sourceUrl={row.sourceUrl}
                        asOf={row.asOf}
                        iconSize="xs"
                      />
                    </span>
                  </div>
                </TableCell>

                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[220px]" title={row.name}>
                      {row.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground border border-border/60 rounded px-1 py-0.2">
                      {row.region}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                  {row.assetClass} · {row.sector}
                </TableCell>

                {/* Last Price */}
                <TableCell className="text-right font-bold tabular-nums">
                  {loading && !data ? (
                    <div className="h-4 w-16 bg-muted/60 animate-pulse rounded ml-auto" />
                  ) : row.last != null ? (
                    <span className="text-foreground">{formatCurrencyPrice(row.last, row.currency)}</span>
                  ) : (
                    <span className="text-muted-foreground font-sans text-xs bg-muted/40 px-2 py-0.5 rounded">
                      —
                    </span>
                  )}
                </TableCell>

                {/* Point Change */}
                <TableCell className="text-right font-medium tabular-nums">
                  {loading && !data ? (
                    <div className="h-4 w-12 bg-muted/60 animate-pulse rounded ml-auto" />
                  ) : row.change != null ? (
                    <span className={cn(row.change >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatPointChange(row.change, row.currency)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-sans text-xs">—</span>
                  )}
                </TableCell>

                {/* 1D % Change */}
                <TableCell className="text-right font-bold tabular-nums">
                  {loading && !data ? (
                    <div className="h-4 w-12 bg-muted/60 animate-pulse rounded ml-auto" />
                  ) : row.d1 != null ? (
                    <span className={cn(row.d1 >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatPct(row.d1)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-sans text-xs">—</span>
                  )}
                </TableCell>

                {/* Data Source */}
                <TableCell className="text-center text-xs text-muted-foreground hidden sm:table-cell">
                  <span className="rounded bg-muted/50 px-2 py-0.5 text-[11px] font-medium">
                    {row.sourceProvider.split(" ")[0]}
                  </span>
                </TableCell>

                <TableCell className="pr-3">
                  <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </TableCell>
              </TableRow>
            ))}

            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No matching instruments found for &ldquo;{searchQuery}&rdquo;.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/20">
          <span>
            Strict pricing provenance: Quotes sourced directly from exchange & institutional market APIs. Simulated numbers are strictly prohibited from market tables.
          </span>
          <span className="text-muted-foreground/80">
            Click any row to launch full quantitative & AI research dossier.
          </span>
        </div>
      </div>
    </div>
  );
}
