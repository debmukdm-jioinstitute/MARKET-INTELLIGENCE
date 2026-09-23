"use client";

import { MetricInfo } from "@/components/my-portfolio/metric-info";
import type { MetricCategory } from "@/lib/my-portfolio/types";

function findMetric(categories: MetricCategory[], id: string) {
  for (const cat of categories) {
    const found = cat.metrics.find((m) => m.id === id);
    if (found) return found;
  }
  return null;
}

function Row({ categories, id }: { categories: MetricCategory[]; id: string }) {
  const metric = findMetric(categories, id);
  if (!metric) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center text-muted-foreground">
        {metric.label}
        <MetricInfo id={metric.id} value={metric.formatted} />
      </span>
      <span className="">{metric.formatted}</span>
    </div>
  );
}

export function RiskExposurePanel({ categories }: { categories: MetricCategory[] }) {
  return (
    <div className="grid grid-cols-2 gap-6 text-sm">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Risk</p>
        <Row categories={categories} id="volatility" />
        <Row categories={categories} id="beta" />
        <Row categories={categories} id="sharpe" />
        <Row categories={categories} id="sortino" />
        <Row categories={categories} id="var" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Exposure</p>
        <Row categories={categories} id="netExposure" />
        <Row categories={categories} id="cashPct" />
        <Row categories={categories} id="concentration" />
        <Row categories={categories} id="effectiveHoldings" />
        <Row categories={categories} id="activeShare" />
      </div>
    </div>
  );
}
