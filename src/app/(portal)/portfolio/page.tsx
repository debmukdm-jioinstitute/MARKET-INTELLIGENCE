"use client";

import { Donut } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { AddHoldingDialog } from "@/components/my-portfolio/add-holding-dialog";
import { AttributionPanel } from "@/components/my-portfolio/attribution-panel";
import { HoldingsList } from "@/components/my-portfolio/holdings-list";
import { MetricsCatalog } from "@/components/my-portfolio/metrics-catalog";
import { PerformanceChart } from "@/components/my-portfolio/performance-chart";
import { PortfolioOverview } from "@/components/my-portfolio/portfolio-overview";
import { RiskExposurePanel } from "@/components/my-portfolio/risk-exposure-panel";
import { BrokerImportDialog } from "@/components/my-portfolio/broker-import-dialog";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { Lock } from "lucide-react";
import Link from "next/link";

const BENCHMARK_LABEL: Record<string, string> = {
  NIFTY50: "NIFTY 50",
  SPX: "S&P 500",
  NDX: "NASDAQ 100",
};

export default function PortfolioPage() {
  const { data, loading, error, locked, addHolding, removeHolding, clearHoldings, importHoldings } = useMyPortfolio();

  return (
    <div className="portal-page">
      <PageHeader
        kicker="PORTFOLIO DESK"
        title={data?.settings.name ?? "Institutional Book"}
        subtitle="Live mark-to-market positions, cross-asset allocation, and factor risk from real exchange feeds. Hover the ℹ️ on any metric for its formula and methodology."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {data?.hasHoldings && data.positions.length > 0 ? (
              <>
                <span className="font-bold text-blue-600">{data.positions.length} active positions</span>
                {" · "}
                <span>Benchmark: <strong className="text-foreground">{BENCHMARK_LABEL[data.settings.benchmark]}</strong></span>
              </>
            ) : (
              <span className="text-blue-600 font-semibold">Clean Book (0 Active Positions)</span>
            )}
          </p>
        </div>

        {locked ? (
          <Link
            href="/login?next=/portfolio"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-blue-600/40 bg-blue-600/10 px-3 py-1.5 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
          >
            <Lock className="size-3.5" />
            Log in to add or import holdings
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            {data?.hasHoldings && data.positions.length > 0 ? (
              <button
                type="button"
                onClick={clearHoldings}
                className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-rose-600 hover:border-rose-600/40 transition-colors"
              >
                Clear Book
              </button>
            ) : null}
            <BrokerImportDialog onImport={importHoldings} />
            <AddHoldingDialog onAdd={addHolding} />
          </div>
        )}
      </div>

      {loading && !data ? <p className="text-sm text-muted-foreground">Syncing live exchange feeds…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {data ? (
        <>
          <PortfolioOverview metrics={data.overview} />

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Performance" subtitle="Portfolio vs benchmark, rebased to your first holding" className="xl:col-span-2">
              <PerformanceChart data={data.navSeries} benchmarkLabel={BENCHMARK_LABEL[data.settings.benchmark] ?? "Benchmark"} />
            </Panel>
            <Panel title="Allocation" subtitle="India vs US, by market value">
              <div className="h-[280px]">
                {data.allocation.length ? (
                  <Donut data={data.allocation} />
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">Add a holding to see allocation.</p>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Risk | Exposure" subtitle="Headline risk and positioning">
              <RiskExposurePanel categories={data.categories} />
            </Panel>
            <Panel title="Attribution" subtitle="Top contributors to total return">
              <AttributionPanel attribution={data.attribution} />
            </Panel>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-heading text-sm font-semibold">Holdings</h3>
              <p className="text-sm text-muted-foreground">Live marks · your book · INR</p>
            </div>
            <HoldingsList positions={data.positions} onRemove={removeHolding} />
          </div>

          <div>
            <h3 className="mb-2 font-heading text-sm font-semibold">Full metrics catalog</h3>
            <MetricsCatalog categories={data.categories} />
          </div>
        </>
      ) : null}
    </div>
  );
}
