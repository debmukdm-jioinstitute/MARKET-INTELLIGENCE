"use client";

import { Bars, Donut } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import type { PositionRow } from "@/lib/my-portfolio/types";
import { formatInr, formatPct } from "@/lib/format";
import Link from "next/link";
import { useMemo } from "react";

function buildSlices(positions: PositionRow[], navInr: number) {
  const sectorMap = new Map<string, number>();
  let india = 0;
  let us = 0;
  for (const p of positions) {
    sectorMap.set(p.sector || "Unclassified", (sectorMap.get(p.sector || "Unclassified") ?? 0) + p.marketValueInr);
    if (p.market === "IN") india += p.marketValueInr;
    else us += p.marketValueInr;
  }
  const nav = navInr > 0 ? navInr : india + us;
  const asset = [
    { name: "India equity", value: india, weight: nav > 0 ? india / nav : 0 },
    { name: "US equity", value: us, weight: nav > 0 ? us / nav : 0 },
  ].filter((a) => a.value > 0);
  const sector = [...sectorMap.entries()]
    .map(([name, value]) => ({ name, value, weight: nav > 0 ? value / nav : 0 }))
    .sort((a, b) => b.value - a.value);
  const region = [
    { name: "India", value: india, weight: nav > 0 ? india / nav : 0 },
    { name: "United States", value: us, weight: nav > 0 ? us / nav : 0 },
  ].filter((r) => r.value > 0);
  return { asset, sector, region, nav };
}

export default function AllocationPage() {
  const { data, loading, error, locked } = useMyPortfolio();

  const { asset, sector, region } = useMemo(
    () => (data?.hasHoldings ? buildSlices(data.positions, data.navInr) : { asset: [], sector: [], region: [] }),
    [data],
  );

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Asset allocation"
        title="Policy vs actual"
        subtitle={
          data?.hasHoldings
            ? "Sleeves, sectors, and geography from your live book (INR mark-to-market)."
            : "Add holdings on Portfolio to see how capital is split across markets and sectors."
        }
      />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading portfolio…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && data && !data.hasHoldings ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {locked ? (
            <>
              <Link href="/login?next=/portfolio/allocation" className="font-semibold text-blue-600 hover:underline">
                Log in
              </Link>{" "}
              to import holdings.
            </>
          ) : (
            <>
              No positions.{" "}
              <Link href="/portfolio" className="font-semibold text-blue-600 hover:underline">
                Open Portfolio
              </Link>{" "}
              to add names.
            </>
          )}
        </div>
      ) : null}

      {data?.hasHoldings ? (
        <>
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
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No market value.</p>
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
                {sector.length ? (
                  <Bars data={sector} y="weight" />
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No sector tags.</p>
                )}
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
                  <p className="mt-1 font-heading text-xl tabular-nums">{formatPct(r.weight, 1)}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{formatInr(r.value)}</p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
