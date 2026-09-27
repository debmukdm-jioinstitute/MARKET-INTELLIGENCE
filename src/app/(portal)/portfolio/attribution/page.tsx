"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { findMetric } from "@/lib/my-portfolio/find-metric";
import type { PositionRow } from "@/lib/my-portfolio/types";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";

const BENCHMARK_LABEL: Record<string, string> = {
  NIFTY50: "NIFTY 50",
  SPX: "S&P 500",
  NDX: "NASDAQ 100",
};

/** Sector-level return contribution (weight × holding return); selection vs benchmark is approximate. */
function sectorRows(positions: PositionRow[], benchmarkReturn: number) {
  const map = new Map<string, { weight: number; contribution: number }>();
  for (const p of positions) {
    const sector = p.sector || "Unclassified";
    const cur = map.get(sector) ?? { weight: 0, contribution: 0 };
    map.set(sector, {
      weight: cur.weight + p.weight,
      contribution: cur.contribution + p.weight * p.pnlPct,
    });
  }
  return [...map.entries()]
    .map(([sector, { weight, contribution }]) => {
      const sectorRet = weight > 0 ? contribution / weight : 0;
      const selection = contribution - weight * benchmarkReturn;
      return {
        sector,
        weight,
        sectorRet,
        allocation: 0,
        selection,
        total: contribution,
      };
    })
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

export default function AttributionPage() {
  const { data, loading, error, locked } = useMyPortfolio();

  const benchLabel = data?.settings.benchmark ? BENCHMARK_LABEL[data.settings.benchmark] ?? data.settings.benchmark : "benchmark";
  const benchReturn = findMetric(data?.categories ?? [], "benchmarkReturn")?.value ?? 0;

  const sectors = useMemo(
    () => (data?.hasHoldings ? sectorRows(data.positions, benchReturn) : []),
    [data, benchReturn],
  );

  const activeReturn = findMetric(data?.categories ?? [], "activeReturn");
  const selection = findMetric(data?.categories ?? [], "securitySelection");
  const absoluteReturn = findMetric(data?.categories ?? [], "absoluteReturn");

  const stockRows = data?.attribution ?? [];

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Performance attribution"
        title="Return decomposition"
        subtitle={
          data?.hasHoldings
            ? `Active return vs ${benchLabel}; stock and sector views from live marks (simplified Brinson where noted).`
            : "Add holdings on Portfolio to attribute return to names and sectors."
        }
      />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading portfolio…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && data && !data.hasHoldings ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {locked ? (
            <>
              <Link href="/login?next=/portfolio/attribution" className="font-semibold text-blue-600 hover:underline">
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
          <div className="grid gap-3 md:grid-cols-3">
            <Tile metricId="activeReturn" label="Active return" value={activeReturn?.formatted ?? "—"} />
            <Tile metricId="securitySelection" label="Selection (approx.)" value={selection?.formatted ?? "—"} />
            <Tile metricId="absoluteReturn" label="Absolute return" value={absoluteReturn?.formatted ?? "—"} />
          </div>

          <Panel title="Top stock contributors" subtitle="Weight × holding return since cost basis">
            {stockRows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockRows.map((row) => (
                    <TableRow key={row.symbol}>
                      <TableCell>{row.symbol}</TableCell>
                      <TableCell className="text-muted-foreground">{row.name}</TableCell>
                      <Cell v={row.contributionPct} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No attribution yet.</p>
            )}
          </Panel>

          <Panel
            title="Sector attribution"
            subtitle="Allocation column reserved until sector benchmark weights are wired; selection uses portfolio vs benchmark return."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Sector return</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      Allocation
                      <MetricInfo id="assetAllocation" name="Allocation Effect" iconSize="xs" />
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      Selection
                      <MetricInfo id="securitySelection" name="Selection Effect" iconSize="xs" />
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      Total
                      <MetricInfo id="activeReturn" name="Sector contribution" iconSize="xs" />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((row) => (
                  <TableRow key={row.sector}>
                    <TableCell>{row.sector}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPct(row.weight, 1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPct(row.sectorRet)}</TableCell>
                    <Cell v={row.allocation} />
                    <Cell v={row.selection} />
                    <Cell v={row.total} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function Tile({ metricId, label, value }: { metricId: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <MetricInfo id={metricId} name={label} iconSize="xs" />
      </div>
      <p className="mt-1 font-heading text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function Cell({ v }: { v: number }) {
  return (
    <TableCell className={cn("text-right tabular-nums", v >= 0 ? "text-emerald-600" : "text-rose-600")}>
      {formatPct(v)}
    </TableCell>
  );
}
