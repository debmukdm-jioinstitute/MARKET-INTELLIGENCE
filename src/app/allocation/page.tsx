"use client";

import { Bars, Donut } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { allocationBy } from "@/lib/analytics";
import { formatPct, formatUsd } from "@/lib/format";
import { useMemo } from "react";

export default function AllocationPage() {
  const { active } = usePortfolio();
  const asset = useMemo(() => allocationBy(active, "assetClass"), [active]);
  const sector = useMemo(() => allocationBy(active, "sector"), [active]);
  const region = useMemo(() => allocationBy(active, "region"), [active]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Asset allocation"
        title="Policy vs actual"
        subtitle="Sleeves, sectors, and geography for the working book. Cash is residual dry powder, not a residual afterthought."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Asset class">
          <div className="h-[280px]">
            <Donut data={asset.map((a) => ({ name: a.name, value: a.value }))} />
          </div>
        </Panel>
        <Panel title="Sector" className="lg:col-span-2">
          <div className="h-[280px]">
            <Bars data={sector} />
          </div>
        </Panel>
      </div>
      <Panel title="Geography">
        <div className="grid gap-3 md:grid-cols-4">
          {region.map((r) => (
            <div key={r.name} className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">{r.name}</p>
              <p className="mt-1 font-heading text-xl">{formatPct(r.weight, 1)}</p>
              <p className="font-mono text-xs text-muted-foreground">{formatUsd(r.value)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
