"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricInfo } from "@/components/ui/metric-info";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { formatPct, formatUsd } from "@/lib/format";
import { applyScenario, SCENARIOS } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import type { ScenarioId } from "@/lib/scenarios";

export default function ScenariosPage() {
  const { active } = usePortfolio();
  const [id, setId] = useState<ScenarioId>("soft-landing");
  const result = useMemo(() => applyScenario(active, id), [active, id]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Scenario analysis"
        title="Regime shocks on the working book"
        subtitle="Instant revaluation under five institutional narratives. Shocks are applied to last marks; cash is invariant."
      />
      <Tabs value={id} onValueChange={(v) => setId(v as ScenarioId)}>
        <TabsList className="flex h-auto flex-wrap">
          {SCENARIOS.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {SCENARIOS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="space-y-4">
            <Panel title={s.name} subtitle={`${s.horizon} · ${s.thesis}`}>
              <div className="grid gap-3 md:grid-cols-3">
                <Tile metricId="nav" label="Base NAV" value={formatUsd(result.baseNav)} />
                <Tile metricId="cvar" label="Stressed NAV" value={formatUsd(result.stressedNav)} />
                <Tile
                  metricId="var_95"
                  label="Scenario P&L"
                  value={`${formatUsd(result.pnl)} (${formatPct(result.pct)})`}
                  hot={result.pct}
                />
              </div>
            </Panel>
            <Panel title="Name-level P&L">
              <div className="space-y-2">
                {result.rows
                  .slice()
                  .sort((a, b) => a.pnl - b.pnl)
                  .map((row) => (
                    <div key={row.symbol} className="flex items-center justify-between font-mono text-sm">
                      <span className="flex items-center gap-1">
                        <span>{row.symbol}</span>
                        <MetricInfo id={row.symbol.toLowerCase()} name={row.symbol} iconSize="xs" />
                      </span>
                      <span className="text-muted-foreground">{formatPct(row.shock)}</span>
                      <span className={row.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {formatUsd(row.pnl)}
                      </span>
                    </div>
                  ))}
              </div>
            </Panel>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Tile({ metricId, label, value, hot }: { metricId?: string; label: string; value: string; hot?: number }) {
  return (
    <div className="rounded-md border border-border p-3 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <MetricInfo id={metricId ?? "nav"} name={label} iconSize="xs" />
      </div>
      <p className={cn("mt-1 text-lg font-semibold", hot !== undefined && (hot >= 0 ? "text-emerald-400" : "text-rose-400"))}>
        {value}
      </p>
    </div>
  );
}
