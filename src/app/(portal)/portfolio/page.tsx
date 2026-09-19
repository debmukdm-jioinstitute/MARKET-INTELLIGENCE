"use client";

import { Bars, Donut, NavChart } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { KpiGrid } from "@/components/portfolio/kpi-grid";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { allocationBy, analyzePortfolio, factorExposures } from "@/lib/analytics";
import { getPriceSeries } from "@/lib/market";
import { TRADING_DAYS } from "@/lib/calendar";
import { useMemo } from "react";

export default function PortfolioPage() {
  const { active } = usePortfolio();
  const analysis = useMemo(() => analyzePortfolio(active, active.benchmark), [active]);
  const asset = useMemo(() => allocationBy(active, "assetClass"), [active]);
  const factors = useMemo(() => factorExposures(active), [active]);
  const chart = useMemo(() => {
    const start = TRADING_DAYS.indexOf(analysis.nav[0]!.date);
    const bench = getPriceSeries(active.benchmark).slice(start);
    const scale = analysis.nav[0]!.value / bench[0]!;
    return analysis.nav.map((p, i) => ({
      date: p.date,
      portfolio: Math.round(p.value),
      benchmark: Math.round(bench[i]! * scale),
    }));
  }, [analysis.nav, active.benchmark]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Portfolio management"
        title={active.name}
        subtitle={`${active.strategy} Benchmark ${active.benchmark}. Inception ${active.inception}.`}
      />
      <KpiGrid metrics={analysis.kpis} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="NAV vs benchmark" subtitle="Rebased to portfolio inception value" className="xl:col-span-2">
          <div className="h-[320px]">
            <NavChart data={chart} aKey="portfolio" bKey="benchmark" bName={active.benchmark} />
          </div>
        </Panel>
        <Panel title="Asset allocation" subtitle="Including residual cash">
          <div className="h-[320px]">
            <Donut data={asset.map((a) => ({ name: a.name, value: a.value }))} />
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Factor exposures" subtitle="Holdings-weighted betas from the internal factor model">
          <div className="h-[260px]">
            <Bars data={factors} x="name" y="value" unit="raw" />
          </div>
        </Panel>
        <Panel title="Mandate" subtitle="Investment policy snapshot">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Strategy</dt>
              <dd className="mt-1">{active.strategy}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">IPS</dt>
              <dd className="mt-1">{active.mandate}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Benchmark</dt>
              <dd className="mt-1 font-mono">{active.benchmark}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cash</dt>
              <dd className="mt-1 font-mono">
                {active.cash.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
      <HoldingsTable />
    </div>
  );
}
