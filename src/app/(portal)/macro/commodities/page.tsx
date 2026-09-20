"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { MetricExplainer } from "@/components/macro/metric-explainer";
import { useMacroTape } from "@/hooks/use-macro-tape";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CommoditiesMacroPage() {
  const { data, loading, error } = useMacroTape();
  const [hist, setHist] = useState<Record<string, { date: string; v: number }[]>>({});

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, { date: string; v: number }[]> = {};
      for (const c of data.commodities) {
        try {
          const res = await fetch(`/api/feeds/yahoo/history?symbol=${encodeURIComponent(c.symbol)}&range=6mo`);
          if (res.ok) {
            const json = (await res.json()) as { points?: { date: string; value: number }[] };
            out[c.id] = (json.points ?? []).map((p) => ({ date: p.date, v: p.value }));
          }
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setHist(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Macro"
        title="Commodity dashboard"
        subtitle="Brent, gold, silver, copper — prices from Yahoo Finance with India transmission context on the macro home."
      />
      <Link href="/macro" className="text-xs text-primary hover:underline">← Macro home</Link>
      {loading && !data ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {data?.commodities.map((c) => (
        <Panel key={c.id} id={c.id} title={c.label}>
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="font-mono text-3xl tabular-nums">${c.price?.toFixed(2) ?? "—"}</p>
            <MetricExplainer copyKey={c.copyKey} />
            <a href={c.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
              {c.source.provider}
            </a>
          </div>
          {hist[c.id]?.length ? (
            <div className="mt-4 h-[220px]">
              <Lines data={hist[c.id]!} keys={[{ key: "v", color: "#d4af37", name: c.label }]} />
            </div>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}
