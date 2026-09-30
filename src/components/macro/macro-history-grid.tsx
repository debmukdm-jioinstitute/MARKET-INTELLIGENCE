"use client";

import { AccessibleLineChart, type ChartPoint } from "@/components/charts/accessible-line-chart";
import { Panel } from "@/components/layout/page-header";
import type { MacroMetric } from "@/lib/macro/types";
import { formatAsOfIst, freshness } from "@/lib/provenance";

function historyToPoints(history: { date: string; value: number }[]): ChartPoint[] {
  return history.map((p) => {
    let ts = p.date;
    if (/^\d{4}$/.test(ts)) ts = `${ts}-07-01`;
    else if (/^\d{4}-\d{2}$/.test(ts)) ts = `${ts}-15`;
    else if (!ts.includes("T")) ts = `${ts}T12:00:00.000Z`;
    return { ts, value: p.value };
  });
}

function metricSourceLine(metric: MacroMetric): string {
  const asOf = metric.source?.asOf ?? metric.history[metric.history.length - 1]?.date ?? null;
  const fresh = freshness(asOf);
  return `${metric.source.provider}${asOf ? ` · ${formatAsOfIst(asOf) ?? asOf} · ${fresh.label}` : ""}`;
}

export function MacroHistoryGrid({ metrics, title = "Historical trends" }: { metrics: MacroMetric[]; title?: string }) {
  const chartable = metrics.filter((m) => m.history.length >= 2);
  if (!chartable.length) return null;

  return (
    <Panel title={`${title} (${chartable.length})`}>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {chartable.map((m) => {
          const points = historyToPoints(m.history);
          const first = points[0]?.ts ?? "";
          const last = points[points.length - 1]?.ts ?? "";
          return (
            <div key={m.id} className="self-start">
              <AccessibleLineChart
                title={`${m.label} · India macro`}
                range={`${first} – ${last}`}
                frequency={points.length > 24 ? "Monthly" : "Periodic"}
                unit={m.unit || "Value"}
                points={points}
                sourceStatus={metricSourceLine(m)}
                filename={`macro-${m.id}`}
                className="h-[200px]"
              />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
