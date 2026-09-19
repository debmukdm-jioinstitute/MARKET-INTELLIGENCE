"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { MACRO } from "@/lib/market";
import { formatSigned } from "@/lib/format";

export default function MacroPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Macroeconomic intelligence"
        title="Nowcast board"
        subtitle="A compact macro book: growth, inflation, labor, policy, dollar, vol, and commodities — the regime context around every portfolio decision."
      />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {MACRO.map((m) => (
          <div key={m.id} className="rounded-lg border border-border bg-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{m.name}</p>
            <p className="mt-1 font-heading text-2xl tabular-nums">
              {m.latest.toFixed(2)}
              <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span>
            </p>
            <p className={m.change >= 0 ? "text-xs text-emerald-400" : "text-xs text-rose-400"}>
              {formatSigned(m.change)}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {MACRO.slice(0, 4).map((m) => (
          <Panel key={m.id} title={m.name}>
            <div className="h-[220px]">
              <Lines
                data={m.points.slice(-60).map((p) => ({ date: p.date, v: p.value }))}
                keys={[{ key: "v", color: "#5ec8e8", name: m.name }]}
              />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
