"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { allocationBy, analyzePortfolio, brinsonAttribution, positionRows } from "@/lib/analytics";
import { LAST_DATE } from "@/lib/calendar";
import { formatPct, formatUsd } from "@/lib/format";
import { useMemo } from "react";

export default function ReportsPage() {
  const { active } = usePortfolio();
  const analysis = useMemo(() => analyzePortfolio(active, active.benchmark), [active]);
  const rows = useMemo(() => positionRows(active), [active]);
  const asset = useMemo(() => allocationBy(active, "assetClass"), [active]);
  const attr = useMemo(() => brinsonAttribution(active, active.benchmark), [active]);

  return (
    <div className="space-y-6 print:p-0">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          kicker="Professional reporting"
          title="Investment committee pack"
          subtitle={`Confidential · ${active.name} · as of ${LAST_DATE}. Print or export to PDF from the browser.`}
        />
        <Button onClick={() => window.print()}>Print / PDF</Button>
      </div>
      <Panel title="Executive summary">
        <p className="text-sm leading-6 text-muted-foreground">
          {active.name} is a virtual {active.baseCurrency} book managed against {active.benchmark}. Mandate:{" "}
          {active.mandate} Strategy: {active.strategy} Current NAV {analysis.kpis[0]!.formatted} with a{" "}
          {analysis.kpis[2]!.formatted} total return since {active.inception}. Risk is characterized by{" "}
          {analysis.kpis[9]!.formatted} volatility, {analysis.kpis[8]!.formatted} maximum drawdown, and{" "}
          {analysis.kpis[12]!.formatted} 95% one-day VaR.
        </p>
      </Panel>
      <Panel title="KPI strip">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {analysis.kpis.map((k) => (
            <div key={k.key} className="rounded-md border border-border p-2">
              <p className="text-[10px] uppercase text-muted-foreground">{k.label}</p>
              <p className="font-mono text-sm">{k.formatted}</p>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Allocation">
          {asset.map((a) => (
            <p key={a.name} className="flex justify-between text-sm">
              <span>{a.name}</span>
              <span className="font-mono">{formatPct(a.weight, 1)}</span>
            </p>
          ))}
        </Panel>
        <Panel title="Top contributors (1M attribution)">
          {attr.slice(0, 6).map((a) => (
            <p key={a.sector} className="flex justify-between text-sm">
              <span>{a.sector}</span>
              <span className="font-mono">{formatPct(a.total)}</span>
            </p>
          ))}
        </Panel>
      </div>
      <Panel title="Holdings">
        <div className="space-y-1 text-sm">
          {rows.map((r) => (
            <p key={r.symbol} className="flex justify-between font-mono">
              <span>
                {r.symbol} {r.shares.toFixed(0)}
              </span>
              <span>
                {formatUsd(r.marketValue)} · {formatPct(r.weight, 1)}
              </span>
            </p>
          ))}
        </div>
      </Panel>
    </div>
  );
}
