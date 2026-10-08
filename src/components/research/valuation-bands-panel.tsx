"use client";

/**
 * Historical Valuation presentation component for /research/[symbol].
 *
 * Purely presentational: renders the payload produced by
 * `buildValuationHistory` (src/lib/research/valuation-history.ts).
 * No data fetching, no calculations, no invented values.
 *
 * Contract (src/lib/research/valuation-history.ts):
 *   ValuationPoint   = { date, pe, pb, evEbitda, evSales, fcfYield }
 *   ValuationStats   = { current, p25, median, p75, min, max, percentile, count, insufficient }
 *   ValuationMultiple = { id: "pe"|"pb"|"ev-ebitda"|"ev-sales"|"fcf-yield",
 *                         label, points: ValuationPoint[],
 *                         stats: Record<"1Y"|"3Y"|"5Y"|"10Y", ValuationStats> }
 *   ValuationHistory = { multiples, asOf, source, notes }
 *
 * Valuation observations come from fundamentals known as of each date
 * (no look-ahead bias). Wording is neutral: never "cheap" or "expensive".
 */

import { useMemo, useState } from "react";
import { Panel } from "@/components/layout/page-header";
import { Fold, Takeaway } from "@/components/guide/explain";
import { cn } from "@/lib/utils";
import type {
  ValuationHistory,
  ValuationMultiple,
  ValuationPoint,
} from "@/lib/research/valuation-history";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const WINDOWS = ["1Y", "3Y", "5Y", "10Y"] as const;
type WindowKey = (typeof WINDOWS)[number];

const WINDOW_YEARS: Record<WindowKey, number> = { "1Y": 1, "3Y": 3, "5Y": 5, "10Y": 10 };
const WINDOW_WORD: Record<WindowKey, string> = { "1Y": "1-year", "3Y": "3-year", "5Y": "5-year", "10Y": "10-year" };

/** Which ValuationPoint field backs each multiple. */
const POINT_FIELD: Record<ValuationMultiple["id"], keyof Omit<ValuationPoint, "date">> = {
  pe: "pe",
  pb: "pb",
  "ev-ebitda": "evEbitda",
  "ev-sales": "evSales",
  "fcf-yield": "fcfYield",
};

const axis = { fontSize: 10, fill: "#5f6368", tickLine: false, axisLine: false };

const MULTIPLE_COLOR = "#1a73e8";
const MEDIAN_COLOR = "#5f6368";

const METHODOLOGY_TEXT =
  "Based on reported fundamentals available at each observation date. Prices are historical closes on or before each reporting date. Windows with fewer than 8 valid observations are marked as insufficient history.";

function pointValue(multiple: ValuationMultiple, p: ValuationPoint): number | null {
  return p[POINT_FIELD[multiple.id]];
}

/** Compact display: 24.3x for multiples, 2.1% for FCF yield. */
function formatValue(multiple: ValuationMultiple, v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (multiple.id === "fcf-yield") return `${v.toFixed(1)}%`;
  return `${v.toFixed(1)}x`;
}

function ordinal(n: number): string {
  const r = Math.round(n);
  const mod100 = r % 100;
  const mod10 = r % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${r}${suffix}`;
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function fullDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

type StatRowProps = {
  multiple: ValuationMultiple;
  window: WindowKey;
};

/** Current / Median / quartiles / range / percentile for the selected window. */
function StatsRow({ multiple, window }: StatRowProps) {
  const stats = multiple.stats[window];
  if (!stats || stats.insufficient) {
    return (
      <p className="text-sm text-muted-foreground">Insufficient valuation history for this period.</p>
    );
  }
  const range =
    stats.p25 != null && stats.p75 != null
      ? `${formatValue(multiple, stats.p25)} - ${formatValue(multiple, stats.p75)}`
      : "—";
  const minMax =
    stats.min != null && stats.max != null
      ? `${formatValue(multiple, stats.min)} - ${formatValue(multiple, stats.max)}`
      : "—";
  const cells: { label: string; value: string }[] = [
    { label: "Current", value: formatValue(multiple, stats.current) },
    { label: "Median", value: formatValue(multiple, stats.median) },
    { label: "P25 - P75", value: range },
    { label: "Min - Max", value: minMax },
    { label: "Percentile", value: stats.percentile != null ? ordinal(stats.percentile) : "—" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {cells.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card px-3 py-2.5">
          <dt className="text-xs font-medium text-muted-foreground">{c.label}</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Neutral, derived interpretation. Never "cheap" or "expensive". */
function NeutralWording({ multiple, window }: StatRowProps) {
  const stats = multiple.stats[window];
  if (!stats || stats.insufficient || stats.current == null || stats.median == null) return null;
  const name = multiple.label;
  const period = WINDOW_WORD[window];
  const medianLine =
    stats.current > stats.median
      ? `Current ${name} is above its ${period} median.`
      : stats.current < stats.median
        ? `Current ${name} is below its ${period} median.`
        : `Current ${name} is near its ${period} median.`;
  const percentileLine =
    stats.percentile != null
      ? `Current ${name} is near the ${ordinal(stats.percentile)} percentile of ${period} observations.`
      : null;
  return (
    <Takeaway tone="info" sub={percentileLine}>
      {medianLine}
    </Takeaway>
  );
}

type ChartPoint = { date: string; short: string; value: number };

function BandChart({ multiple, window }: StatRowProps) {
  const stats = multiple.stats[window];
  const points: ChartPoint[] = useMemo(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - WINDOW_YEARS[window]);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return multiple.points
      .filter((p) => p.date >= cutoffIso)
      .map((p) => {
        const v = pointValue(multiple, p);
        return v != null && Number.isFinite(v)
          ? { date: p.date, short: shortDate(p.date), value: v }
          : null;
      })
      .filter((p): p is ChartPoint => p !== null);
  }, [multiple, window]);

  if (!stats || stats.insufficient) return null;
  if (points.length === 0) return null;

  const name = multiple.label;
  const last = points[points.length - 1];
  const showBand = stats.p25 != null && stats.p75 != null && stats.p25 < stats.p75;

  return (
    <div className="h-[240px] w-full" role="img" aria-label={`${name} valuation history over ${WINDOW_WORD[window]}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#e8eaed" vertical={false} />
          <XAxis dataKey="short" {...axis} interval="preserveStartEnd" minTickGap={48} />
          <YAxis
            {...axis}
            width={48}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => formatValue(multiple, v)}
          />
          <Tooltip
            contentStyle={{ background: "#ffffff", border: "1px solid #e8eaed", fontSize: 11, borderRadius: 8 }}
            labelFormatter={(_label, payload) => {
              const p = payload?.[0]?.payload as ChartPoint | undefined;
              return p ? fullDate(p.date) : String(_label);
            }}
            formatter={(v) => [formatValue(multiple, typeof v === "number" ? v : NaN), name]}
          />
          {showBand ? (
            <ReferenceArea
              y1={stats.p25 as number}
              y2={stats.p75 as number}
              fill={MULTIPLE_COLOR}
              fillOpacity={0.09}
              stroke="none"
              ifOverflow="extendDomain"
            />
          ) : null}
          {stats.median != null ? (
            <ReferenceLine
              y={stats.median}
              stroke={MEDIAN_COLOR}
              strokeDasharray="5 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: `${WINDOW_WORD[window]} median`,
                position: "insideTopLeft",
                fontSize: 10,
                fill: MEDIAN_COLOR,
              }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            name={name}
            stroke={MULTIPLE_COLOR}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          {stats.current != null && last ? (
            <ReferenceDot
              x={last.short}
              y={stats.current}
              r={5}
              fill={MULTIPLE_COLOR}
              stroke="#ffffff"
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function MultipleSection({ multiple }: { multiple: ValuationMultiple }) {
  const available = WINDOWS.filter((w) => {
    const s = multiple.stats[w];
    return s && !s.insufficient;
  });
  const initial: WindowKey | null = available.includes("5Y")
    ? "5Y"
    : (available[0] ?? null);
  const [window, setWindow] = useState<WindowKey | null>(initial);

  const name = multiple.label;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-foreground">{name}</h4>
        {available.length > 0 && window ? (
          <div
            role="group"
            aria-label={`${name} time window`}
            className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
          >
            {available.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={window === w}
                onClick={() => setWindow(w)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  window === w
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {w}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {window ? (
        <>
          <BandChart multiple={multiple} window={window} />
          <StatsRow multiple={multiple} window={window} />
          <NeutralWording multiple={multiple} window={window} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Insufficient valuation history for this period.</p>
      )}
    </div>
  );
}

export function ValuationBandsPanel({ valuation }: { valuation: ValuationHistory | null }) {
  const multiples = valuation?.multiples ?? [];
  if (!valuation || multiples.length === 0) {
    return (
      <Panel
        id="historical-valuation"
        title="Historical valuation"
        subtitle="Valuation multiples over time, against their own history"
      >
        <p className="text-sm text-muted-foreground">Historical valuation is unavailable for this company.</p>
      </Panel>
    );
  }

  const notes = valuation.notes ?? [];

  return (
    <Panel
      id="historical-valuation"
      title="Historical valuation"
      subtitle="Valuation multiples over time, against their own history"
    >
      <div className="space-y-6">
        {multiples.map((m, i) => (
          <div key={m.id}>
            <MultipleSection multiple={m} />
            {i < multiples.length - 1 ? <hr className="mt-6 border-border" /> : null}
          </div>
        ))}
        <Fold title="Methodology">
          <p className="text-sm leading-relaxed text-muted-foreground">{METHODOLOGY_TEXT}</p>
          {notes.length > 0 ? (
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
        </Fold>
      </div>
    </Panel>
  );
}

export function ValuationBandsSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-card shadow-[var(--shadow-sm)] p-4"
      aria-hidden
      aria-label="Loading historical valuation"
    >
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-44 rounded-md bg-muted" />
        <div className="h-5 w-64 rounded-md bg-muted" />
        <div className="flex justify-end">
          <div className="h-9 w-48 rounded-lg bg-muted" />
        </div>
        <div className="h-[240px] rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {["a", "b", "c", "d", "e"].map((k) => (
            <div key={k} className="rounded-xl border border-border px-3 py-2.5">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="mt-2 h-6 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
