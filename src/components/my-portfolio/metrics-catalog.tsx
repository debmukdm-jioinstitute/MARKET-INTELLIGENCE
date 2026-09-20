"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { MetricInfo } from "@/components/my-portfolio/metric-info";
import { cn } from "@/lib/utils";
import type { MetricCategory } from "@/lib/my-portfolio/types";

export function MetricsCatalog({ categories }: { categories: MetricCategory[] }) {
  return (
    <Accordion type="multiple" defaultValue={categories.map((c) => c.id)} className="rounded-lg border border-border bg-card px-4">
      {categories.map((cat) => (
        <AccordionItem key={cat.id} value={cat.id}>
          <AccordionTrigger className="font-heading text-sm font-semibold">{cat.title}</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-x-6 gap-y-2 pb-3 sm:grid-cols-2 xl:grid-cols-3">
              {cat.metrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between gap-2 border-b border-border/50 py-1.5">
                  <span className="flex items-center text-xs text-muted-foreground">
                    {metric.label}
                    <MetricInfo id={metric.id} />
                  </span>
                  <span className="flex items-center gap-1.5 text-right">
                    {metric.status !== "ok" ? (
                      <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase text-muted-foreground">
                        {metric.status === "na" ? "N/A" : "approx"}
                      </Badge>
                    ) : null}
                    <span
                      className={cn(
                        "font-mono text-xs font-medium tabular-nums",
                        metric.status === "na" && "text-muted-foreground/50",
                        metric.tone === "up" && "text-emerald-400",
                        metric.tone === "down" && "text-rose-400",
                        metric.tone === "warn" && "text-amber-300",
                      )}
                    >
                      {metric.formatted}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
