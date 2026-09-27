import type { MetricCategory, MetricResult } from "@/lib/my-portfolio/types";

export function findMetric(categories: MetricCategory[], id: string): MetricResult | undefined {
  for (const cat of categories) {
    const hit = cat.metrics.find((m) => m.id === id);
    if (hit) return hit;
  }
  return undefined;
}
