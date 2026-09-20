"use client";

import { NavChart } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MetricInfo } from "@/components/ui/metric-info";
import { runBacktest, STRATEGY_PRESETS } from "@/lib/backtest";
import { formatPct } from "@/lib/format";
import { useMemo, useState } from "react";

export default function BacktestPage() {
  const [idx, setIdx] = useState(0);
  const preset = STRATEGY_PRESETS[idx]!;
  const result = useMemo(() => runBacktest(preset), [preset]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Backtesting"
        title="Rule-based allocation replay"
        subtitle="Walk the simulated tape from 2019 with monthly or quarterly rebalance. Compare against an equal-weight sleeve of the same names."
      />
      <div className="flex flex-wrap gap-2">
        {STRATEGY_PRESETS.map((p, i) => (
          <Button key={p.name} variant={i === idx ? "default" : "outline"} onClick={() => setIdx(i)}>
            {p.name}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {preset.symbols.join(" · ")} · {preset.rebalance} rebalance
      </p>
      <div className="grid gap-3 md:grid-cols-5">
        <Tile metricId="total_return" label="Total return" value={formatPct(result.stats.totalReturn)} />
        <Tile metricId="total_return" label="CAGR" value={formatPct(result.stats.cagr)} />
        <Tile metricId="beta" label="Vol" value={formatPct(result.stats.vol)} />
        <Tile metricId="sharpe" label="Sharpe" value={result.stats.sharpe.toFixed(2)} />
        <Tile metricId="max_drawdown" label="Max DD" value={formatPct(result.stats.maxDrawdown)} />
      </div>
      <Panel title="Growth of $1" subtitle="Gold = strategy · Cyan = equal weight">
        <div className="h-[340px]">
          <NavChart
            data={result.nav.map((p) => ({
              date: p.date,
              portfolio: Number(p.portfolio.toFixed(3)),
              benchmark: Number(p.equal.toFixed(3)),
            }))}
            aName={preset.name}
            bName="Equal weight"
          />
        </div>
      </Panel>
    </div>
  );
}

function Tile({ metricId, label, value }: { metricId?: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <MetricInfo id={metricId ?? "sharpe"} name={label} iconSize="xs" />
      </div>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
