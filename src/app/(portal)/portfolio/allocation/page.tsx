"use client";

import { Bars, Donut } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { allocationBy } from "@/lib/analytics";
import { formatInr, formatPct } from "@/lib/format";
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
        <Panel
          title={
            <span className="flex items-center gap-2">
              <span>Asset class</span>
              <MetricInfo id="concentration" name="Asset Class Concentration" iconSize="xs" />
            </span>
          }
        >
          <div className="h-[280px]">
            {asset.length ? (
              <Donut data={asset.map((a) => ({ name: a.name, value: a.value }))} />
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Add a holding to see allocation.
              </p>
            )}
          </div>
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <span>Sector</span>
              <MetricInfo id="concentration" name="Sector Concentration" iconSize="xs" />
            </span>
          }
          className="lg:col-span-2"
        >
          <div className="h-[280px]">
            <Bars data={sector} y="weight" />
          </div>
        </Panel>
      </div>
      <Panel
        title={
          <span className="flex items-center gap-2">
            <span>Geography</span>
            <MetricInfo id="concentration" name="Geographic Allocation" iconSize="xs" />
          </span>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          {region.map((r) => (
            <div key={r.name} className="rounded-md border border-border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{r.name}</p>
                <MetricInfo id="concentration" name={`${r.name} Geographic Exposure`} iconSize="xs" />
              </div>
              <p className="mt-1 font-heading text-xl">{formatPct(r.weight, 1)}</p>
              <p className="text-sm text-muted-foreground">{formatInr(r.value)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
