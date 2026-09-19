"use client";

import { Bars } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
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
        <Tile label="Expected return" value={formatPct(result.stats.ret)} />
        <Tile label="Expected vol" value={formatPct(result.stats.vol)} />
        <Tile label="Sharpe" value={result.stats.sharpe.toFixed(2)} />
      </div>
      <Panel title="Target weights">
        <div className="h-[420px]">
          <Bars data={result.weights.map((w) => ({ name: w.symbol, value: w.weight }))} />
        </div>
      </Panel>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
