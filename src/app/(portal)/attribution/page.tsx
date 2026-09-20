"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricInfo } from "@/components/ui/metric-info";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { brinsonAttribution } from "@/lib/analytics";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export default function AttributionPage() {
  const { active } = usePortfolio();
  const rows = useMemo(() => brinsonAttribution(active, active.benchmark), [active]);
  const total = rows.reduce(
    (acc, r) => ({
      allocation: acc.allocation + r.allocation,
      selection: acc.selection + r.selection,
      total: acc.total + r.total,
    }),
    { allocation: 0, selection: 0, total: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Performance attribution"
        title="Brinson-Fachler · 1 month"
        subtitle={`Allocation versus ${active.benchmark} plus within-sector selection. Interaction is shown for completeness.`}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Tile metricId="concentration" label="Allocation effect" value={formatPct(total.allocation)} />
        <Tile metricId="alpha" label="Selection effect" value={formatPct(total.selection)} />
        <Tile metricId="alpha" label="Active return (approx.)" value={formatPct(total.total)} />
      </div>
      <Panel title="Sector attribution">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Sector return</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Allocation
                  <MetricInfo id="concentration" name="Allocation Effect" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Selection
                  <MetricInfo id="alpha" name="Selection Effect" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Total
                  <MetricInfo id="alpha" name="Total Brinson Contribution" iconSize="xs" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.sector}>
                <TableCell>{row.sector}</TableCell>
                <TableCell className="text-right font-mono">{formatPct(row.weight, 1)}</TableCell>
                <TableCell className="text-right font-mono">{formatPct(row.sectorRet)}</TableCell>
                <Cell v={row.allocation} />
                <Cell v={row.selection} />
                <Cell v={row.total} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}

function Tile({ metricId, label, value }: { metricId?: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <MetricInfo id={metricId ?? "alpha"} name={label} iconSize="xs" />
      </div>
      <p className="mt-1 font-heading text-2xl">{value}</p>
    </div>
  );
}

function Cell({ v }: { v: number }) {
  return (
    <TableCell className={cn("text-right font-mono", v >= 0 ? "text-emerald-400" : "text-rose-400")}>
      {formatPct(v)}
    </TableCell>
  );
}
