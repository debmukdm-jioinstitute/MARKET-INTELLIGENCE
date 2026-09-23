"use client";

import { Bars } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { Progress } from "@/components/ui/progress";
import { MetricInfo } from "@/components/ui/metric-info";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { analyzePortfolio, factorExposures, riskContribution } from "@/lib/analytics";
import { formatPct } from "@/lib/format";
import { useMemo } from "react";

export default function RiskPage() {
  const { active } = usePortfolio();
  const analysis = useMemo(() => analyzePortfolio(active, active.benchmark), [active]);
  const rc = useMemo(() => riskContribution(active).slice(0, 10), [active]);
  const factors = useMemo(() => factorExposures(active), [active]);
  const vol = analysis.kpis.find((k) => k.key === "volatility")!;
  const mdd = analysis.kpis.find((k) => k.key === "maxDrawdown")!;
  const var95 = analysis.kpis.find((k) => k.key === "var95")!;
  const te = analysis.kpis.find((k) => k.key === "trackingError")!;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Risk management"
        title="Active risk budget"
        subtitle="Volatility, tail, drawdown, and name-level risk contribution — the language of a risk desk, not a watchlist."
      />
      <div className="grid gap-3 md:grid-cols-4">
        <RiskStat metricId="beta" label="Volatility" value={vol.formatted} used={Math.min(100, vol.value / 0.2 * 100)} cap="20% policy" />
        <RiskStat metricId="max_drawdown" label="Max drawdown" value={mdd.formatted} used={Math.min(100, Math.abs(mdd.value) / 0.35 * 100)} cap="35% limit" />
        <RiskStat metricId="var_95" label="1-day 95% VaR" value={var95.formatted} used={55} cap="Historical" />
        <RiskStat metricId="tracking_error" label="Tracking error" value={te.formatted} used={Math.min(100, te.value / 0.08 * 100)} cap="8% TE budget" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Risk contribution" subtitle="Weight × name volatility, normalized">
          <div className="h-[320px]">
            <Bars data={rc.map((r) => ({ name: r.symbol, value: r.riskShare }))} />
          </div>
        </Panel>
        <Panel title="Factor book">
          <div className="h-[320px]">
            <Bars data={factors} unit="raw" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function RiskStat({
  metricId,
  label,
  value,
  used,
  cap,
}: {
  metricId?: string;
  label: string;
  value: string;
  used: number;
  cap: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <MetricInfo id={metricId ?? label.toLowerCase()} name={label} iconSize="xs" />
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <Progress value={used} className="mt-3" />
      <p className="mt-2 text-sm text-muted-foreground">{cap} · {formatPct(used / 100, 0)} utilized</p>
    </div>
  );
}
