"use client";

import { Bars } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MetricInfo } from "@/components/ui/metric-info";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { formatPct } from "@/lib/format";
import { optimizeWeights, type OptimizeGoal } from "@/lib/optimizer";
import { useMemo, useState } from "react";

export default function OptimizerPage() {
  const { active } = usePortfolio();
  const [goal, setGoal] = useState<OptimizeGoal>("maxSharpe");
  const result = useMemo(
    () => optimizeWeights(active.holdings.map((h) => h.symbol), goal),
    [active, goal],
  );

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Portfolio optimization"
        title="Mean-variance / risk parity"
        subtitle="Re-weights the current names (long-only, 1% floor). This is a teaching optimizer, not a black-box allocator."
      />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["maxSharpe", "Max Sharpe"],
            ["minVol", "Min volatility"],
            ["riskParity", "Risk parity"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} variant={goal === id ? "default" : "outline"} onClick={() => setGoal(id)}>
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Tile metricId="total_return" label="Expected return" value={formatPct(result.stats.ret)} />
        <Tile metricId="beta" label="Expected vol" value={formatPct(result.stats.vol)} />
        <Tile metricId="sharpe" label="Sharpe" value={result.stats.sharpe.toFixed(2)} />
      </div>
      <Panel
        title={
          <span className="flex items-center gap-2">
            <span>Target weights</span>
            <MetricInfo id="concentration" name="Optimized Target Weights" iconSize="xs" />
          </span>
        }
      >
        <div className="h-[420px]">
          <Bars data={result.weights.map((w) => ({ name: w.symbol, value: w.weight }))} />
        </div>
      </Panel>
    </div>
  );
}

function Tile({ metricId, label, value }: { metricId?: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <MetricInfo id={metricId ?? "sharpe"} name={label} iconSize="xs" />
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
