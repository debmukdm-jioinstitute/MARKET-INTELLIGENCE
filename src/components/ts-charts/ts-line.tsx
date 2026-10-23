"use client";
import { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from "recharts";
import { TsTooltip } from "./ts-tooltip";
import { fmtVal, type Fmt } from "@/lib/ts-charts/format";
import { useZoom } from "./use-zoom";

export type Series = { col: string; label: string; slot?: number; tone?: "hist" };
type Row = { date: string; [k: string]: number | null | string };

const color = (s: Series, i: number) => (s.tone === "hist" ? "var(--hist)" : `var(--s${s.slot ?? i + 1})`);

export function TsLine({ rows, series, band, fmt = "num", digits = 1, narrow = false }: { rows: Row[]; series: Series[]; band?: [number, number]; fmt?: Fmt; digits?: number; narrow?: boolean }) {
  const [hot, setHot] = useState<string | null>(null);
  const z = useZoom(rows);
  const w = series.length > 4 ? 1.75 : 2;
  const last = z.data.length - 1;
  return (
    <div className="ts-chart relative h-[220px] sm:h-[320px]" {...z.touchHandlers}>
      {z.zoomed && (
        <button type="button" onClick={z.reset} className="absolute right-2 top-0 z-10 rounded border px-2 text-xs" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
          Reset zoom
        </button>
      )}
      <ResponsiveContainer debounce={120}>
        <LineChart data={z.data} margin={{ top: 12, right: narrow ? 8 : 110, bottom: 4, left: 0 }} {...z.mouseHandlers}>
          <CartesianGrid vertical={false} stroke="var(--grid)" shapeRendering="crispEdges" />
          <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "var(--axis)" }} tick={{ fontSize: 11, fill: "var(--ink-3)" }} minTickGap={48} />
          <YAxis orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickFormatter={(v: number) => fmtVal(v, fmt, 0)} width={48} domain={["auto", "auto"]} />
          {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="var(--h-band)" stroke="var(--h-edge)" ifOverflow="extendDomain" />}
          {z.sel && <ReferenceArea x1={z.sel[0]} x2={z.sel[1]} fill="var(--ink)" fillOpacity={0.06} />}
          <Tooltip cursor={{ stroke: "var(--ink-3)", strokeWidth: 1 }} trigger={narrow ? "click" : "hover"} content={<TsTooltip fmt={fmt} digits={digits} />} />
          {series.map((s, i) => (
            <Line
              key={s.col}
              dataKey={s.col}
              name={s.label}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
              stroke={color(s, i)}
              strokeWidth={hot === s.col ? 2.5 : w}
              strokeOpacity={hot && hot !== s.col ? 0.38 : 1}
              strokeLinejoin="round"
              onMouseEnter={() => setHot(s.col)}
              onMouseLeave={() => setHot(null)}
              label={narrow ? undefined : (p: { index?: number; x?: number | string; y?: number | string; value?: unknown }) =>
                p.index === last && typeof p.value === "number" ? (
                  <text key={s.col} x={Number(p.x ?? 0) + 6} y={Number(p.y ?? 0)} dy={4} fontSize={11.5} fill="var(--ink-2)">
                    {s.label} <tspan fontWeight={600} fontSize={12.5}>{fmtVal(p.value, fmt, digits)}</tspan>
                  </text>
                ) : <g key={`${s.col}-${p.index}`} />
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {narrow && (
        <ul className="mt-1 flex flex-wrap gap-x-3 text-xs" style={{ color: "var(--ink-2)" }}>
          {series.map((s, i) => (
            <li key={s.col} className="flex items-center gap-1"><span style={{ width: 12, height: 2, background: color(s, i) }} />{s.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
