"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { MacroTapeSkeleton } from "@/components/macro/macro-tape-skeleton";
import { MetricExplainer } from "@/components/macro/metric-explainer";
import { useMacroTape } from "@/hooks/use-macro-tape";
import {
  COMMODITY_CATEGORY_LABEL,
  COMMODITY_UNIVERSE,
  formatCommodityPrice,
  type CommodityCategory,
} from "@/lib/macro/commodity-universe";
import type { TapeQuote } from "@/lib/macro/build-tape";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CATEGORY_ORDER: CommodityCategory[] = ["energy", "precious", "industrial", "agriculture"];

function changePctClass(pct: number | null) {
  if (pct == null) return "text-muted-foreground";
  return pct >= 0 ? "text-chart-2" : "text-destructive";
}

function CommodityCard({
  quote,
  def,
  hist,
}: {
  quote: TapeQuote;
  def: (typeof COMMODITY_UNIVERSE)[number];
  hist?: { date: string; v: number }[];
}) {
  return (
    <Panel id={def.id} title={def.label} subtitle={def.unit}>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-2xl font-semibold tabular-nums">{formatCommodityPrice(def, quote.price)}</p>
        <span className={cn("text-sm font-medium tabular-nums", changePctClass(quote.changePct))}>
          {quote.changePct != null
            ? `${quote.changePct >= 0 ? "+" : ""}${(quote.changePct * 100).toFixed(2)}%`
            : "—"}
        </span>
        <MetricExplainer copyKey={def.copyKey} />
        <a href={quote.source.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary">
          {quote.source.provider}
        </a>
      </div>
      {hist?.length ? (
        <div className="mt-4 h-[180px]">
          <Lines data={hist} keys={[{ key: "v", color: "var(--primary)", name: def.label }]} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">6-month chart loading…</p>
      )}
    </Panel>
  );
}

export default function CommoditiesMacroPage() {
  const { data, loading, error } = useMacroTape();
  const [hist, setHist] = useState<Record<string, { date: string; v: number }[]>>({});

  const defById = useMemo(() => new Map(COMMODITY_UNIVERSE.map((d) => [d.id, d])), []);
  const quotesByCategory = useMemo(() => {
    const map = new Map<CommodityCategory, TapeQuote[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    if (!data?.commodities) return map;
    for (const q of data.commodities) {
      const def = defById.get(q.id);
      if (!def) continue;
      map.get(def.category)?.push(q);
    }
    return map;
  }, [data?.commodities, defById]);

  useEffect(() => {
    if (!data?.commodities.length) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        data.commodities.map(async (c) => {
          try {
            const res = await fetch(`/api/feeds/yahoo/history?symbol=${encodeURIComponent(c.symbol)}&range=6mo`);
            if (!res.ok) return [c.id, [] as { date: string; v: number }[]] as const;
            const json = (await res.json()) as { points?: { date: string; value: number }[] };
            const points = (json.points ?? []).map((p) => ({ date: p.date, v: p.value }));
            return [c.id, points] as const;
          } catch {
            return [c.id, [] as { date: string; v: number }[]] as const;
          }
        }),
      );
      if (cancelled) return;
      const out: Record<string, { date: string; v: number }[]> = {};
      for (const [id, points] of results) out[id] = points;
      setHist(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Macro"
        title="Commodity dashboard"
        subtitle={`${COMMODITY_UNIVERSE.length} global benchmarks — energy, metals, and ag softs from Yahoo Finance, with India transmission context on macro home.`}
      />
      <Link href="/macro" className="text-sm text-primary hover:underline">
        ← Macro home
      </Link>
      {loading && !data ? <MacroTapeSkeleton count={6} /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {CATEGORY_ORDER.map((cat) => {
        const rows = quotesByCategory.get(cat) ?? [];
        if (!rows.length && !data) return null;
        return (
          <section key={cat} className="mt-8 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">{COMMODITY_CATEGORY_LABEL[cat]}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((q) => {
                const def = defById.get(q.id);
                if (!def) return null;
                return <CommodityCard key={q.id} quote={q} def={def} hist={hist[q.id]} />;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
