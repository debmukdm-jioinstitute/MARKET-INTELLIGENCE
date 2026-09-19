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
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {metric.label}
              </p>
              <p
                className={cn(
                  "mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight",
                  metric.tone === "up" && "text-emerald-400",
                  metric.tone === "down" && "text-rose-400",
                  metric.tone === "warn" && "text-amber-300",
                )}
              >
                {metric.formatted}
              </p>
              {metric.deltaLabel ? (
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{metric.deltaLabel}</p>
              ) : null}
            </article>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{metric.hint}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
