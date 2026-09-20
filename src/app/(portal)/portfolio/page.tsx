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
import { useMyPortfolio } from "@/hooks/use-my-portfolio";

const BENCHMARK_LABEL: Record<string, string> = {
  NIFTY50: "NIFTY 50",
  SPX: "S&P 500",
  NDX: "NASDAQ 100",
};

export default function PortfolioPage() {
  const { data, loading, error, addHolding, removeHolding } = useMyPortfolio();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Portfolio"
        title={data?.settings.name ?? "My Portfolio"}
        subtitle="Add your own India and US holdings and track them against a real benchmark — every number below is computed from live and historical market data, or clearly marked when it isn't available."
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data?.hasHoldings ? `${data.positions.length} holdings · benchmark ${BENCHMARK_LABEL[data.settings.benchmark]}` : "No holdings yet"}
        </p>
        <AddHoldingDialog onAdd={addHolding} />
      </div>

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading portfolio…</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

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
