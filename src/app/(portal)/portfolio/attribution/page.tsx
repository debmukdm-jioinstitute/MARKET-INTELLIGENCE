"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { BENCHMARK_LABEL } from "@/lib/my-portfolio/benchmark-options";
import { findMetric } from "@/lib/my-portfolio/find-metric";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AttributionPage() {
  const { data, loading, error, locked } = useMyPortfolio();

  const benchLabel = data?.settings.benchmark ? BENCHMARK_LABEL[data.settings.benchmark] ?? data.settings.benchmark : "benchmark";

  const sectors = data?.sectorAttribution ?? [];

  const activeReturn = findMetric(data?.categories ?? [], "activeReturn");
  const allocation = findMetric(data?.categories ?? [], "assetAllocation");
  const selection = findMetric(data?.categories ?? [], "securitySelection");
  const absoluteReturn = findMetric(data?.categories ?? [], "absoluteReturn");

  const stockRows = data?.attribution ?? [];

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Attribution"
        title="What made you money"
        subtitle={
          data?.hasHoldings
            ? `Which stocks and sectors drove your returns vs ${benchLabel}.`
            : "Which stocks and sectors drove your returns. Add your holdings to break it down."
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Tile metricId="activeReturn" label="Active return" value={activeReturn?.formatted ?? "—"} />
            <Tile metricId="assetAllocation" label="Allocation effect" value={allocation?.formatted ?? "—"} />
            <Tile metricId="securitySelection" label="Selection effect" value={selection?.formatted ?? "—"} />
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
            subtitle="Portfolio vs benchmark sector weights; returns aligned to your NAV history window."
          >
            {sectors.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Port. wt</TableHead>
                  <TableHead className="text-right">Bench. wt</TableHead>
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
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatPct(row.benchmarkWeight, 1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPct(row.sectorRet)}</TableCell>
                    <Cell v={row.allocation} />
                    <Cell v={row.selection + row.interaction} />
                    <Cell v={row.total} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Need a few days of price history for Brinson sector attribution.</p>
            )}
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
