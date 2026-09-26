"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { MetricInfo } from "@/components/ui/metric-info";
import type { IndiaDashboardPayload, MacroRow } from "@/lib/feeds/india/types";
import { fmtNum } from "@/lib/format-india";

export function IndiaMacro({ data }: { data: IndiaDashboardPayload }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm uppercase tracking-[0.22em] text-primary">India macro</h2>
      <p className="mt-1 text-sm text-muted-foreground">Current · previous · 12M trend (official / open data only).</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-sm uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 pr-4">Indicator</th>
              <th className="py-2 pr-4 text-right">Current</th>
              <th className="py-2 pr-4 text-right">Previous</th>
              <th className="py-2 pr-4">Direction</th>
              <th className="py-2">12M trend</th>
              <th className="py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {data.indiaMacro.map((row) => (
              <MacroTableRow key={row.id} row={row} hubSyncedAt={data.fetchedAt} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MacroTableRow({ row, hubSyncedAt }: { row: MacroRow; hubSyncedAt: string }) {
  const dir =
    row.direction === "up" ? "↑" : row.direction === "down" ? "↓" : row.direction === "flat" ? "→" : "—";
  const chart = row.history12m.map((p) => ({ date: p.date.slice(0, 7), v: p.value }));
  return (
    <tr className="border-b border-border/60">
      <td className="py-3 pr-4 font-medium flex items-center gap-1.5">
        <span>{row.indicator}</span>
        <MetricInfo
          id={row.id}
          name={row.indicator}
          provider={row.source.provider}
          sourceUrl={row.source.url}
          asOf={row.source.asOf ?? hubSyncedAt}
          iconSize="xs"
        />
      </td>
      <td className="py-3 pr-4 text-right">
        {row.current != null ? `${fmtNum(row.current)} ${row.unit}` : "—"}
      </td>
      <td className="py-3 pr-4 text-right text-muted-foreground">
        {row.previous != null ? `${fmtNum(row.previous)} ${row.unit}` : "—"}
      </td>
      <td className="py-3 pr-4">{dir}</td>
      <td className="py-3">
        {chart.length > 1 ? (
          <div className="h-[48px] w-[140px]">
            <Lines data={chart} keys={[{ key: "v", color: "#5ec8e8", name: row.indicator }]} />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-3">
        <MetricInfo
          id={row.id}
          name={row.indicator}
          provider={row.source.provider}
          sourceUrl={row.source.url}
          asOf={row.source.asOf ?? hubSyncedAt}
          iconSize="xs"
        />
      </td>
    </tr>
  );
}
