"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { KpiMetric } from "@/lib/types";

export function KpiGrid({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <Tooltip key={metric.key}>
          <TooltipTrigger asChild>
            <article className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
                {metric.label}
              </p>
              <p
                className={cn(
                  "mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight",
                  metric.tone === "up" && "text-emerald-600",
                  metric.tone === "down" && "text-rose-600",
                  metric.tone === "warn" && "text-blue-600",
                )}
              >
                {metric.formatted}
              </p>
              {metric.deltaLabel ? (
                <p className="mt-1 text-sm text-muted-foreground">{metric.deltaLabel}</p>
              ) : null}
            </article>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-sm">{metric.hint}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
