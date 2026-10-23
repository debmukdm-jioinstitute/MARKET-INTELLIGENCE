"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceDot, Tooltip } from "recharts";
import { TsTooltip } from "./ts-tooltip";
import { fmtVal, type Fmt } from "@/lib/ts-charts/format";

export function TsIndicator({ rows, recentFrom, band, hue = "var(--s1)", fmt = "num", digits = 1, compact = false }: { rows: { date: string; v: number }[]; recentFrom: string; band: [number, number]; hue?: string; fmt?: Fmt; digits?: number; compact?: boolean }) {
  const pts = rows.filter((r) => r.v != null && Number.isFinite(r.v));
  if (!pts.length) return <p className="text-sm" style={{ color: "var(--ink-3)" }}>Source unavailable</p>;
  const data = pts.map((d) => ({ date: d.date, past: d.date <= recentFrom ? d.v : null, now: d.date >= recentFrom ? d.v : null }));
  const hi = pts.reduce((a, b) => (b.v > a.v ? b : a));
  const lo = pts.reduce((a, b) => (b.v < a.v ? b : a));
  const last = pts[pts.length - 1];
  const pos = last.v > band[1] ? "above" : last.v < band[0] ? "below" : "inside";
  return (
    <figure role="img" aria-label={`Latest ${fmtVal(last.v, fmt, digits)} on ${last.date}, ${pos} its usual range`} className={`ts-chart m-0 ${compact ? "h-[120px]" : "h-[220px] sm:h-[260px]"}`} style={{ ["--h" as string]: hue }}>
      <ResponsiveContainer debounce={120}>
        <LineChart data={data} margin={{ top: 14, right: compact ? 4 : 48, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          {!compact && <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "var(--axis)" }} minTickGap={60} tick={{ fontSize: 11, fill: "var(--ink-3)" }} />}
          {!compact && <YAxis orientation="right" axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickFormatter={(v: number) => fmtVal(v, fmt, 0)} />}
          <ReferenceArea y1={band[0]} y2={band[1]} fill="var(--h-band)" stroke="var(--h-edge)"
            label={compact ? undefined : { value: `usual range, ${fmtVal(band[0], fmt, digits)} to ${fmtVal(band[1], fmt, digits)}`, position: "insideTopLeft", fontStyle: "italic", fontSize: 12, fill: "var(--ink-2)" }} />
          <Tooltip cursor={{ stroke: "var(--ink-3)" }} content={<TsTooltip fmt={fmt} digits={digits} />} />
          <Line dataKey="past" name="History" stroke="var(--hist)" strokeWidth={compact ? 1.25 : 1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="now" name="Recent" stroke="var(--h)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          {!compact && <ReferenceDot x={hi.date} y={hi.v} r={3.5} fill="var(--paper)" stroke="var(--ink-2)" label={{ value: `High ${fmtVal(hi.v, fmt, digits)}`, position: "top", fontSize: 11 }} />}
          {!compact && <ReferenceDot x={lo.date} y={lo.v} r={3.5} fill="var(--paper)" stroke="var(--ink-2)" label={{ value: `Low ${fmtVal(lo.v, fmt, digits)}`, position: "bottom", fontSize: 11 }} />}
          <ReferenceDot x={last.date} y={last.v} r={8} fill="var(--h)" fillOpacity={0.25} stroke="none" />
          <ReferenceDot x={last.date} y={last.v} r={3.75} fill="var(--h)" stroke="none" />
        </LineChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">{pos} its usual range</figcaption>
    </figure>
  );
}
