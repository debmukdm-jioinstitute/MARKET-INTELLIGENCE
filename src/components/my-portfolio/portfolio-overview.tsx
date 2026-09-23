"use client";

import { MetricInfo } from "@/components/my-portfolio/metric-info";
import { cn } from "@/lib/utils";
import type { MetricResult } from "@/lib/my-portfolio/types";

/** Notes carry internal "§1.1"-style spec citations for engineering traceability; strip them for the reader-facing caption. */
function readerNote(note?: string) {
  if (!note) return note;
  const cleaned = note
    .replace(/§\d+(?:\.\d+)*/g, "")
    .replace(/\s*[—-]\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || undefined;
}

export function PortfolioOverview({ metrics }: { metrics: MetricResult[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <article key={metric.id} className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {metric.label}
            <MetricInfo id={metric.id} value={metric.formatted} />
          </div>
          <p
            className={cn(
              "mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight",
              metric.status === "na" && "text-muted-foreground/50",
              metric.tone === "up" && "text-emerald-600",
              metric.tone === "down" && "text-rose-600",
              metric.tone === "warn" && "text-blue-600",
            )}
          >
            {metric.formatted}
          </p>
          {readerNote(metric.note) ? (
            <p className="mt-1 text-[10px] text-muted-foreground">{readerNote(metric.note)}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
