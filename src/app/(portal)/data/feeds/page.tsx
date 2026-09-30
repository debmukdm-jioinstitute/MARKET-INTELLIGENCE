"use client";

import { DataInfo } from "@/components/feeds/data-info";
import { MarketStatusBadge } from "@/components/feeds/market-status-badge";
import { SourceHealthGrid } from "@/components/feeds/source-health";
import { SourceHealthMonitor, type MonitoredSource } from "@/components/feeds/source-health-monitor";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { SemanticSearchBox } from "@/components/ui/semantic-search-box";
import { ArrowRight, Newspaper, TrendingUp, Landmark } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

const healthFetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Health HTTP ${res.status}`);
  return json as { generatedAt: string; counts: Record<string, number> | null; sources: MonitoredSource[] };
};

function useSourceHealthMonitor() {
  const { data } = useSWR("/api/health/sources", healthFetcher, { refreshInterval: 120_000 });
  return data ?? null;
}

export default function FeedsPage() {
  const { data, loading, error, reload } = useFeedHub(45_000);
  const monitor = useSourceHealthMonitor();

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Feeds"
        title="Market data feeds"
        subtitle="Which feeds are up, which are slow, and when each last sent data: NSE, BSE, RBI, FRED, World Bank, IMF, OECD, MOSPI, and Upstox."
      />

      <div className="max-w-xl">
        <SemanticSearchBox corpus="feeds" placeholder="Search data providers (e.g. &quot;where does GDP data come from&quot;)" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => reload()}
          className="rounded-lg border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors shadow-xs"
        >
          Refresh Feeds
        </button>
        <MarketStatusBadge />
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Connecting to telemetry hub…</p>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {data ? (
        <>
          {/* Feed Health Matrix */}
          <Panel
            title="Upstream Source Health & Latency"
            subtitle={
              <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                Last hub sync ·{" "}
                <span className="tabular-nums">{new Date(data.fetchedAt).toLocaleString()}</span>
                <DataInfo
                  source={{ provider: "Feed Hub", url: "/api/feeds/hub", asOf: data.fetchedAt }}
                  hubSyncedAt={data.fetchedAt}
                />
              </span>
            }
          >
            <SourceHealthGrid rows={data.health} hubSyncedAt={data.fetchedAt} />
          </Panel>

          {/* Persisted Source-Health Monitor (Phase 5) */}
          <Panel
            title="Source Health Monitor"
            subtitle={
              monitor ? (
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  Recorded runs only ·{" "}
                  <span className="tabular-nums">{new Date(monitor.generatedAt).toLocaleString()}</span>
                  {monitor.counts ? (
                    <span>
                      · {monitor.counts.healthy ?? 0} healthy · {monitor.counts.degraded ?? 0} degraded ·{" "}
                      {monitor.counts.failing ?? 0} failing · {monitor.counts.unknown ?? 0} unknown
                    </span>
                  ) : null}
                </span>
              ) : (
                "Recorded runs only — collectors plus feed-hub sources"
              )
            }
          >
            {monitor ? (
              <SourceHealthMonitor sources={monitor.sources} />
            ) : (
              <p className="text-sm text-muted-foreground">Loading recorded source health…</p>
            )}
          </Panel>

          {/* Feed Consumers & Routing Architecture */}
          <Panel
            title="Live Data Routing & Analytical Desks"
            subtitle="Upstream data streams aggregated by the feed engine are routed to their designated analytical pages across the platform."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/intelligence"
                className="group flex flex-col justify-between rounded-xl border border-border bg-card/60 p-4 transition-all hover:bg-accent/40 hover:border-primary/50 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <Newspaper className="size-4" />
                    <span>Regulatory & News Desk</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">
                    Regulatory & Exchange Headlines
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Live RSS headlines from RBI, SEBI, NSE, and BSE corporate filings now stream directly on the Intelligence terminal.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                  <span>View Intelligence Feed</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/markets/india"
                className="group flex flex-col justify-between rounded-xl border border-border bg-card/60 p-4 transition-all hover:bg-accent/40 hover:border-primary/50 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <TrendingUp className="size-4" />
                    <span>Equity Benchmarks</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">
                    India Benchmarks Cockpit
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Live prices and intraday percentage moves for Nifty 50, Sensex, and heavyweight index constituents on the India Cockpit.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                  <span>Open India Markets</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/macro/rbi"
                className="group flex flex-col justify-between rounded-xl border border-border bg-card/60 p-4 transition-all hover:bg-accent/40 hover:border-primary/50 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <Landmark className="size-4" />
                    <span>Central Banking</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">
                    RBI Policy & Liquidity
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Overnight VRRR auction notices, OMO sales, T-bill auction cut-offs, and LAF corridor operations on the RBI desk.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                  <span>Open RBI Desk</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
