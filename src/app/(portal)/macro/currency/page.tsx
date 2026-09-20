"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { MetricExplainer } from "@/components/macro/metric-explainer";
import { useMacroTape } from "@/hooks/use-macro-tape";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function CurrencyMacroPage() {
  const { data, loading, error } = useMacroTape();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Macro"
        title="Currency"
        subtitle="USD/INR and DXY matter most for Indian equities; other crosses for trade and travel."
      />
      <Link href="/macro" className="text-xs text-primary hover:underline">← Macro home</Link>
      {loading && !data ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {data?.currencies.map((c) => (
        <Panel key={c.id} title={c.label}>
          <div id={c.id} className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-3xl tabular-nums">
              {c.id === "dxy" ? c.price?.toFixed(2) : `₹${c.price?.toFixed(2) ?? "—"}`}
            </p>
            <MetricExplainer copyKey={c.copyKey} />
            {c.changePct != null ? (
              <span className={cn("font-mono text-sm", c.changePct >= 0 ? "text-rose-400" : "text-emerald-400")}>
                {c.changePct >= 0 ? "+" : ""}
                {(c.changePct * 100).toFixed(2)}%
              </span>
            ) : null}
            <a href={c.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
              {c.source.provider} ↗
            </a>
          </div>
        </Panel>
      ))}
    </div>
  );
}
