"use client";

/**
 * Financial X-Ray presentation component for /research/[symbol].
 *
 * Purely presentational: renders the analytics payload produced by
 * `buildXRay` (src/lib/research/xray.ts). No data fetching, no calculations,
 * no invented values. Honest states ("Unavailable", "Not applicable",
 * "Insufficient history") are rendered instead of zeros per the Phase 1
 * spec (sections 16-17).
 *
 * Contract (src/lib/research/xray.ts):
 *   XRayRow      = { id, label, unit, latest: Metric, byPeriod: Record<string, Metric> }
 *   XRayTrend    = { id, label, unit, points: { periodKey, value }[] } (newest last)
 *   FinancialXRay = { periods: {key,label}[], growth, profitability, health,
 *                     cashQuality, efficiency: XRayRow[], trends, asOf, source }
 * Metric pct values are PERCENT numbers (18.7 = 18.7%), matching
 * src/lib/financials/ratios.ts conventions.
 */

import { useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Panel } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { fmtInr, fmtNum } from "@/lib/format-india";
import { cn } from "@/lib/utils";
import type { Metric, MetricState } from "@/lib/research/analytics-types";
import type { FinancialXRay, XRayRow, XRayTrend } from "@/lib/research/xray";

const RANGES = [3, 5, 10] as const;
type RangeYears = (typeof RANGES)[number];

const STATE_LABEL: Record<Exclude<MetricState, "ok">, string> = {
  unavailable: "Unavailable",
  "not-applicable": "Not applicable",
  "insufficient-history": "Insufficient history",
};

/** Short deterministic methodology per driver row id (for the info tooltip). */
const METHODOLOGY: Record<string, string> = {
  "revenue-cagr": "Compound annual growth rate: (end / start)^(1/years) - 1, longest computable trailing window",
  "ebitda-cagr": "Compound annual growth rate: (end / start)^(1/years) - 1, longest computable trailing window",
  "pat-cagr": "Compound annual growth rate: (end / start)^(1/years) - 1, longest computable trailing window",
  "eps-cagr": "Compound annual growth rate: (end / start)^(1/years) - 1, longest computable trailing window",
  "cfo-cagr": "Compound annual growth rate: (end / start)^(1/years) - 1, longest computable trailing window",
  "gross-margin": "Gross profit / revenue",
  "ebitda-margin": "EBITDA / revenue",
  "ebit-margin": "EBIT / revenue",
  "pat-margin": "PAT / revenue",
  roe: "PAT / average shareholders' equity",
  roce: "EBIT / average capital employed",
  "net-debt": "Total debt - cash and equivalents",
  "net-debt-ebitda": "Net debt / EBITDA",
  "debt-equity": "Total debt / shareholders' equity",
  "interest-coverage": "EBIT / interest expense",
  "current-ratio": "Current assets / current liabilities",
  "cfo-pat": "Cash flow from operations / PAT",
  fcf: "CFO - capital expenditure",
  "fcf-margin": "Free cash flow / revenue",
  "fcf-conversion": "Free cash flow / EBITDA",
  "capex-revenue": "Capital expenditure / revenue",
  "receivable-days": "Average receivables / revenue x 365",
  "inventory-days": "Average inventory / COGS x 365",
  "payable-days": "Average payables / COGS x 365",
  ccc: "Receivable days + inventory days - payable days",
  "asset-turnover": "Revenue / average total assets",
};

/** Unit-aware value rendering. pct values are already percent numbers. */
function formatMetricValue(metric: Metric): string | null {
  if (metric.state !== "ok" || metric.value == null || !Number.isFinite(metric.value)) {
    return null;
  }
  const v = metric.value;
  switch (metric.unit) {
    case "inr-cr":
      return `${fmtInr(v)} Cr`;
    case "pct":
      return `${v.toFixed(1)}%`;
    case "multiple":
      return `${fmtNum(v, 2)}×`;
    case "days":
      return `${fmtNum(v, 0)} days`;
    case "ratio":
      return `${fmtNum(v, 2)}×`;
    default:
      return fmtNum(v, 2);
  }
}

function XRayMetricRow({ row }: { row: XRayRow }) {
  const metric = row.latest;
  const display = formatMetricValue(metric);
  const stateLabel = metric.state === "ok" ? null : STATE_LABEL[metric.state];
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3">
      <p className="flex min-w-0 items-center text-sm font-medium text-foreground">
        <span className="truncate">{row.label}</span>
        <MetricInfo
          name={row.label}
          calculation={METHODOLOGY[row.id] ?? row.label}
          provider={metric.source.provider}
          sourceUrl={metric.source.sourceUrl}
          asOf={metric.source.filingDate ?? metric.source.retrievedAt}
          period={metric.source.period}
          size="xs"
        />
      </p>
      <div className="shrink-0 text-right">
        {display ? (
          <p className="font-sans text-base font-bold tabular-nums text-foreground">{display}</p>
        ) : (
          <p
            className="text-sm text-muted-foreground"
            title={metric.note ?? undefined}
          >
            {stateLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function XRayTrendCard({
  trend,
  years,
  periodLabels,
}: {
  trend: XRayTrend;
  years: RangeYears;
  periodLabels: Map<string, string>;
}) {
  const sliced = trend.points.slice(-years);
  const data = sliced
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ label: periodLabels.get(p.periodKey) ?? p.periodKey, value: p.value as number }));
  const firstLabel = data[0]?.label;
  const lastLabel = data[data.length - 1]?.label;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5">
      <p className="text-sm font-semibold text-foreground">{trend.label}</p>
      {data.length >= 2 ? (
        <div className="mt-2 h-16 text-primary/80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-2 flex h-16 items-center text-xs text-muted-foreground">
          Not enough data to draw a trend.
        </p>
      )}
      {firstLabel && lastLabel ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {firstLabel}-{lastLabel}
        </p>
      ) : null}
    </div>
  );
}

function RangeControl({
  years,
  onChange,
}: {
  years: RangeYears;
  onChange: (y: RangeYears) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-0.5 text-sm font-semibold"
      role="group"
      aria-label="Trend range"
    >
      {RANGES.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onChange(y)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1 transition-all",
            years === y
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {y}Y
        </button>
      ))}
    </div>
  );
}

const SECTIONS: { id: string; title: string; key: "growth" | "profitability" | "health" | "cashQuality" | "efficiency" }[] = [
  { id: "growth", title: "Growth", key: "growth" },
  { id: "profitability", title: "Profitability", key: "profitability" },
  { id: "health", title: "Balance-sheet health", key: "health" },
  { id: "cash-quality", title: "Cash quality", key: "cashQuality" },
  { id: "efficiency", title: "Operating efficiency", key: "efficiency" },
];

export function FinancialXRayPanel({ xray }: { xray: FinancialXRay | null }) {
  const [years, setYears] = useState<RangeYears>(5);

  if (!xray) {
    return (
      <Panel
        id="financial-xray"
        title="Financial X-Ray"
        subtitle="Analytical overview of reported financials: growth, profitability, balance-sheet health, cash quality, and operating efficiency."
      >
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Financial X-Ray is unavailable for this company.
          </p>
        </div>
      </Panel>
    );
  }

  const periodLabels = new Map(xray.periods.map((p) => [p.key, p.label] as const));
  const firstLabel = xray.periods[0]?.label;
  const lastLabel = xray.periods[xray.periods.length - 1]?.label;

  return (
    <Panel
      id="financial-xray"
      title="Financial X-Ray"
      subtitle="Analytical overview of reported financials: growth, profitability, balance-sheet health, cash quality, and operating efficiency."
      action={<RangeControl years={years} onChange={setYears} />}
    >
      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.id} aria-label={section.title}>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {xray[section.key].map((row) => (
                <XRayMetricRow key={row.id} row={row} />
              ))}
            </div>
          </section>
        ))}

        {xray.trends.length > 0 ? (
          <section aria-label="Historical trend">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Historical trend
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {xray.trends.map((trend) => (
                <XRayTrendCard key={trend.id} trend={trend} years={years} periodLabels={periodLabels} />
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Derived from reported {firstLabel}-{lastLabel} financial statements.
          {xray.asOf ? ` Updated: ${xray.asOf}.` : null}
        </p>
      </div>
    </Panel>
  );
}

export function FinancialXRaySkeleton() {
  return (
    <Panel
      id="financial-xray"
      title="Financial X-Ray"
      subtitle="Analytical overview of reported financials."
    >
      <div className="space-y-6" aria-hidden>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted/60" />
        {[0, 1, 2, 3, 4].map((s) => (
          <div key={s} className="space-y-2.5">
            <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <div key={r} className="h-16 animate-pulse rounded-xl bg-muted/40" />
              ))}
            </div>
          </div>
        ))}
        <div className="space-y-2.5">
          <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((t) => (
              <div key={t} className="h-28 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        </div>
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted/40" />
      </div>
    </Panel>
  );
}
