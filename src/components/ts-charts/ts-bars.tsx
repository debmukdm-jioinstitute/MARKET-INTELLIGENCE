"use client";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { TsTooltip } from "./ts-tooltip";
import { fmtVal, type Fmt } from "@/lib/ts-charts/format";
import type { Series } from "./ts-line";

type Row = { date: string; [k: string]: number | null | string };
export type BarKind = "bars" | "share" | "area" | "histogram" | "curve";

export function TsBars({ kind = "bars", rows, series, stacked = false, horizontal = false, fmt = "num", digits = 1 }: { kind?: BarKind; rows: Row[]; series: Series[]; stacked?: boolean; horizontal?: boolean; fmt?: Fmt; digits?: number }) {
  const col = (s: Series, i: number) => `var(--s${s.slot ?? i + 1})`;
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--grid)" shapeRendering="crispEdges" />
      <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "var(--axis)" }} tick={{ fontSize: 11, fill: "var(--ink-3)" }} minTickGap={48} />
      <YAxis orientation="right" tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickFormatter={(v: number) => (kind === "share" ? `${Math.round(v * 100)}%` : fmtVal(v, fmt, 0))} />
      <Tooltip cursor={{ fill: "var(--paper-2)" }} content={<TsTooltip fmt={fmt} digits={digits} />} />
    </>
  );
  return (
    <div className="ts-chart h-[220px] sm:h-[320px]">
      <ResponsiveContainer debounce={120}>
        {kind === "area" || kind === "curve" ? (
          <AreaChart data={rows} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
            {axes}
            {series.map((s, i) => <Area key={s.col} dataKey={s.col} name={s.label} stroke={col(s, i)} fill={col(s, i)} fillOpacity={0.18} strokeWidth={2} dot={kind === "curve" ? { r: 4, fill: col(s, i) } : false} isAnimationActive={false} stackId={stacked ? "a" : undefined} />)}
          </AreaChart>
        ) : (
          <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} stackOffset={kind === "share" ? "expand" : undefined} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
            {axes}
            {series.map((s, i) => (
              <Bar key={s.col} dataKey={s.col} name={s.label} fill={col(s, i)} radius={0} isAnimationActive={false} stackId={stacked || kind === "share" ? "a" : undefined}>
                {series.length === 1 && rows.map((r) => <Cell key={r.date} fill={(r[s.col] as number) < 0 ? "var(--neg)" : col(s, i)} />)}
              </Bar>
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
