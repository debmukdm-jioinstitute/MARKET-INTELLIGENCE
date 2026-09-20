"use client";

import { Lines } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { formatSigned } from "@/lib/format";
import { MACRO } from "@/lib/market";

export default function MacroPage() {
  const { data } = useFeedHub(120_000);
  const live = data?.macro ?? [];
  const cards = live.length
    ? live
    : MACRO.map((m) => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        latest: m.latest,
        change: m.change,
        points: m.points.map((p) => ({ date: p.date, value: p.value })),
        source: "fred" as const,
      }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Macroeconomic intelligence"
        title="Nowcast board"
        subtitle={
          live.length
            ? "Live macro series from FRED, World Bank, IMF, OECD, and MOSPI (where available)."
            : "Pulling open macro APIs — showing simulated fallback until hub responds."
        }
      />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.slice(0, 10).map((m) => (
          <div key={m.id} className="rounded-lg border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">
                {m.name}
              </p>
              <MetricInfo
                id={m.id.toLowerCase().includes("cpi") ? "cpi" : m.id.toLowerCase().includes("gdp") ? "gdp" : m.id.toLowerCase().includes("repo") ? "repo" : m.id.toLowerCase().includes("10y") ? "gsec10y" : m.id}
                name={m.name}
                provider="FRED (Federal Reserve Bank of St. Louis) / MOSPI / OECD"
                sourceUrl="https://fred.stlouisfed.org"
                asOf={data?.fetchedAt}
                iconSize="xs"
              />
            </div>
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
        {cards.slice(0, 4).map((m) => (
          <Panel
            key={m.id}
            title={
              <span className="flex items-center gap-2">
                <span>{m.name}</span>
                <MetricInfo
                  id={m.id.toLowerCase().includes("cpi") ? "cpi" : m.id.toLowerCase().includes("gdp") ? "gdp" : m.id.toLowerCase().includes("repo") ? "repo" : m.id.toLowerCase().includes("10y") ? "gsec10y" : m.id}
                  name={m.name}
                  provider="FRED / MOSPI Open Macro Feeds"
                  sourceUrl="https://fred.stlouisfed.org"
                  asOf={data?.fetchedAt}
                  iconSize="xs"
                />
              </span>
            }
          >
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
