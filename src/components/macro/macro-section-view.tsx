"use client";

import { Bars, Donut, Lines } from "@/components/charts/terminal-charts";
import { Panel } from "@/components/layout/page-header";
import { RegimeBanner } from "@/components/macro/regime-banner";
import type { IndiaMacroHubPayload, MacroMetric, MacroSectionId } from "@/lib/macro/types";
import { sectionMeta } from "@/lib/macro/sections-meta";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function MacroSectionView({
  sectionId,
  data,
}: {
  sectionId: MacroSectionId;
  data: IndiaMacroHubPayload;
}) {
  const meta = sectionMeta(sectionId);

  if (sectionId === "regime") {
    return (
      <div className="space-y-6">
        <RegimeBanner regime={data.regime} />
        <Panel title="Growth + inflation (history)">
          <div className="h-[280px]">
            <Lines
              data={data.regime.growthInflationChart}
              keys={[
                { key: "growth", color: "#3dd68c", name: "GDP growth % y/y" },
                { key: "inflation", color: "#f97316", name: "CPI % y/y" },
              ]}
            />
          </div>
        </Panel>
        <Panel title="Regime quadrants (historical)">
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4">Regime</th>
                  <th className="py-2 pr-4">Growth</th>
                  <th className="py-2">Inflation</th>
                </tr>
              </thead>
              <tbody>
                {data.regime.history.slice().reverse().slice(0, 12).map((h) => (
                  <tr key={h.date} className="border-b border-border/50">
                    <td className="py-2 pr-4">{h.date}</td>
                    <td className="py-2 pr-4">{h.label}</td>
                    <td className="py-2 pr-4">{h.growthScore.toFixed(1)}%</td>
                    <td className="py-2">{h.inflationScore.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <RegimeLegend />
        </Panel>
      </div>
    );
  }

  const section = data.sections[sectionId];
  const topMetrics = section.metrics.filter((m) => m.history.length > 0 || m.value != null).slice(0, 6);
  const pieData = sectionId === "inflation"
    ? (section.metrics.find((m) => m.id === "cpi_basket")?.children ?? [])
        .filter((c) => c.value != null)
        .slice(0, 8)
        .map((c) => ({ name: c.label.slice(0, 18), value: Math.abs(c.value!) }))
    : sectionId === "growth"
      ? (section.metrics.find((m) => m.id === "gva_sectors")?.children ?? [])
          .filter((c) => c.value != null)
          .map((c) => ({ name: c.label.slice(0, 16), value: c.value! }))
      : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/macro" className="text-sm text-primary hover:underline">← Macro home</Link>
        <h2 className="mt-2 font-heading text-2xl">{meta.title}</h2>
        <p className="text-sm text-muted-foreground">{section.subtitle}</p>
        {section.highlights.length ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            {section.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {sectionId === "inflation" ? <InflationHero metrics={section.metrics} /> : null}

      {topMetrics.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topMetrics.map((m) => (
            <MetricCard key={m.id} metric={m} large={sectionId === "inflation" && m.id === "cpi_headline"} />
          ))}
        </div>
      ) : null}

      {pieData.length >= 3 ? (
        <Panel title={sectionId === "inflation" ? "CPI basket (visual)" : "GVA mix (% GDP)"}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-[260px]">
              <Donut data={pieData} />
            </div>
            <div className="h-[260px]">
              <Bars data={pieData} x="name" y="value" unit="raw" />
            </div>
          </div>
        </Panel>
      ) : null}

      {section.metrics.map((m) => (
        <MetricBlock key={m.id} metric={m} depth={0} />
      ))}
    </div>
  );
}

function InflationHero({ metrics }: { metrics: MacroMetric[] }) {
  const headline = metrics.find((m) => m.id === "cpi_headline");
  const momentum = metrics.find((m) => m.id === "infl_momentum");
  const children = momentum?.children ?? [];
  return (
    <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-background p-6">
      <p className="text-[11px] uppercase tracking-[0.22em] text-orange-300">INFLATION</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroStat label="Headline CPI" value={headline?.value} unit="% y/y" />
        {children.map((c) => (
          <HeroStat key={c.id} label={c.label} value={c.value} unit={c.unit} />
        ))}
      </div>
    </div>
  );
}

function HeroStat({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl tabular-nums text-orange-200">
        {value != null ? value.toFixed(2) : "—"}
        <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function MetricCard({ metric, large }: { metric: MacroMetric; large?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{metric.label}</p>
      <p className={cn("mt-1 tabular-nums text-foreground", large ? "text-3xl" : "text-2xl")}>
        {metric.value != null ? metric.value.toFixed(2) : metric.hint ? "↗" : "—"}
        <span className="ml-1 text-sm text-muted-foreground">{metric.unit}</span>
      </p>
      {metric.change != null ? (
        <p className={cn("text-sm", metric.change >= 0 ? "text-emerald-600" : "text-rose-600")}>
          Δ {metric.change >= 0 ? "+" : ""}
          {metric.change.toFixed(2)}
        </p>
      ) : null}
      {metric.history.length > 1 ? (
        <div className="mt-3 h-[100px]">
          <Lines
            data={metric.history.map((p) => ({ date: p.date, v: p.value }))}
            keys={[{ key: "v", color: "#1a73e8", name: metric.label }]}
          />
        </div>
      ) : null}
    </div>
  );
}

function MetricBlock({ metric, depth }: { metric: MacroMetric; depth: number }) {
  const hasChildren = metric.children && metric.children.length > 0;

  if (depth === 0 && !hasChildren && metric.history.length <= 1 && metric.value == null && !metric.hint) {
    return null;
  }

  return (
    <div className={cn(depth > 0 && "ml-4 border-l border-border/50 pl-4")}>
      {depth === 0 && (hasChildren || metric.history.length > 1 || metric.value != null) ? (
        <Panel title={metric.label}>
          <MetricBody metric={metric} />
          {hasChildren ? (
            <div className="mt-4 space-y-2">
              {metric.children!.map((c) => (
                <MetricBlock key={c.id} metric={c} depth={depth + 1} />
              ))}
            </div>
          ) : null}
        </Panel>
      ) : (
        <div className="py-2">
          <MetricBody metric={metric} compact />
        </div>
      )}
    </div>
  );
}

function MetricBody({ metric, compact }: { metric: MacroMetric; compact?: boolean }) {
  if (metric.value == null && metric.hint) {
    return (
      <a
        href={metric.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-wrap items-center justify-between gap-2 text-sm hover:text-primary"
      >
        <span>{metric.label}</span>
        <span className="text-sm text-muted-foreground">{metric.hint}</span>
      </a>
    );
  }
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-2", compact && "text-sm")}>
      <span className={compact ? "text-muted-foreground" : "font-medium"}>{metric.label}</span>
      <span className="tabular-nums">
        {metric.value != null ? `${metric.value.toFixed(2)} ${metric.unit}` : "—"}
      </span>
    </div>
  );
}

function RegimeLegend() {
  const rows = [
    { name: "Goldilocks", g: "↑", i: "↓" },
    { name: "Reflation", g: "↑", i: "↑" },
    { name: "Stagflation", g: "↓", i: "↑" },
    { name: "Deflation", g: "↓", i: "↓" },
  ];
  return (
    <table className="w-full max-w-md text-sm">
      <thead>
        <tr className="text-muted-foreground">
          <th className="py-1 text-left">Regime</th>
          <th className="py-1">Growth</th>
          <th className="py-1">Inflation</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td className="py-1">{r.name}</td>
            <td className="py-1 text-center">{r.g}</td>
            <td className="py-1 text-center">{r.i}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
