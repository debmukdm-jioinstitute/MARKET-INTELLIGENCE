"use client";

import { DataInfo } from "@/components/feeds/data-info";
import { MarketStatusBadge } from "@/components/feeds/market-status-badge";
import { SourceHealthGrid } from "@/components/feeds/source-health";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { ArrowRight, Newspaper, TrendingUp, Landmark } from "lucide-react";
import Link from "next/link";

export default function FeedsPage() {
  const { data, loading, error, reload } = useFeedHub(45_000);

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Data Plane"
        title="Live Market Feeds & Ingestion Health"
        subtitle="Operational telemetry and health monitoring for all upstream market feeds — NSE, BSE, RBI, FRED, World Bank, IMF, OECD, MOSPI, and Upstox market data."
      />

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
              <span className="inline-flex items-center gap-1.5">
                Last hub synchronization {new Date(data.fetchedAt).toLocaleString()}
                <DataInfo
                  source={{ provider: "Feed Hub", url: "/api/feeds/hub", asOf: data.fetchedAt }}
                  hubSyncedAt={data.fetchedAt}
                />
              </span>
            }
          >
            <SourceHealthGrid rows={data.health} />
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
