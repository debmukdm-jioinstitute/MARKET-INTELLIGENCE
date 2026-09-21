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

const BENCHMARK_LABEL: Record<string, string> = {
  NIFTY50: "NIFTY 50",
  SPX: "S&P 500",
  NDX: "NASDAQ 100",
};

export default function PortfolioPage() {
  const { data, loading, error, addHolding, removeHolding, resetToDefault, clearHoldings, importHoldings } = useMyPortfolio();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="PORTFOLIO DESK"
        title={data?.settings.name ?? "Institutional Book"}
        subtitle="Live mark-to-market positions, cross-asset allocation, and factor risk from real exchange feeds. Hover the ℹ️ on any metric for its formula and methodology."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <p className="font-mono text-xs text-muted-foreground">
            {data?.hasHoldings && data.positions.length > 0 ? (
              <>
                <span className="font-bold text-amber-400">{data.positions.length} active positions</span>
                {" · "}
                <span>Benchmark: <strong className="text-foreground">{BENCHMARK_LABEL[data.settings.benchmark]}</strong></span>
              </>
            ) : (
              <span className="text-amber-300 font-semibold">Clean Book (0 Active Positions)</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data?.hasHoldings && data.positions.length > 0 ? (
            <button
              type="button"
              onClick={clearHoldings}
              className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 font-mono text-xs font-semibold text-muted-foreground hover:text-rose-400 hover:border-rose-400/40 transition-colors"
            >
              Clear Book
            </button>
          ) : (
            <button
              type="button"
              onClick={resetToDefault}
              className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-400 hover:text-black transition-colors"
            >
              Load Default Portfolio
            </button>
          )}
          <BrokerImportDialog onImport={importHoldings} />
          <AddHoldingDialog onAdd={addHolding} />
        </div>
      </div>

      {loading && !data ? <p className="font-mono text-sm text-muted-foreground">Syncing live exchange feeds…</p> : null}
      {error ? <p className="font-mono text-sm text-rose-400">{error}</p> : null}

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
              <p className="text-xs text-muted-foreground">Live marks · your book · INR</p>
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
