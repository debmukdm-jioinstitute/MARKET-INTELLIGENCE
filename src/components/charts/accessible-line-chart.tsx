"use client";

import { SignedPct } from "@/components/ui/signed-value";
import { cn } from "@/lib/utils";
import { useId, useMemo, useState } from "react";

export type ChartPoint = { ts: string; value: number };

const TZ = "Asia/Kolkata";

function fmtWhen(ts: string, intraday: boolean) {
  const d = new Date(ts);
  return intraday
    ? `${d.toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "short" })}, ${d.toLocaleTimeString("en-GB", { timeZone: TZ, hour12: false })} IST`
    : d.toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
}

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Line chart that meets the chart spec: names metric + instrument, states range and frequency,
 * labels axis units, gives an exact tooltip (time, value, change vs first point, source status),
 * uses a marker as well as colour, and offers a table view and CSV download of the same data.
 */
export function AccessibleLineChart({
  title,
  range,
  frequency,
  unit,
  points,
  sourceStatus,
  intraday = false,
  loading,
  emptyMessage,
  filename,
  className,
}: {
  /** "Metric · Instrument", e.g. "Index level · NIFTY 50". */
  title: string;
  range: string;
  /** e.g. "5-minute" or "Daily close". */
  frequency: string;
  /** Axis unit, e.g. "Index points" or "INR". */
  unit: string;
  points: ChartPoint[];
  /** e.g. "NSE via Upstox · Updated 3 min ago". Shown in the tooltip. */
  sourceStatus: string;
  intraday?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  filename: string;
  className?: string;
}) {
  const uid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range_ = max - min || 1;
    const W = 480, H = 120, padL = 44, padB = 4;
    const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL);
    const y = (v: number) => H - padB - ((v - min) / range_) * (H - padB - 10) - 5;
    const d = points.map((p, i) => `${i ? "L" : "M"} ${x(i)},${y(p.value)}`).join(" ");
    return { W, H, padL, min, max, x, y, d };
  }, [points]);

  const first = points[0]?.value;
  const hi = hover != null ? points[hover] : null;

  function download() {
    const rows = [["timestamp_ist", `value_${unit.replace(/\s+/g, "_").toLowerCase()}`], ...points.map((p) => [fmtWhen(p.ts, true), String(p.value)])];
    const blob = new Blob([rows.map((r) => r.map(csvEscape).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const fmt = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <figure className={cn("space-y-1.5", className)}>
      <figcaption>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{range} · {frequency} · axis in {unit}</p>
      </figcaption>

      <div className="relative h-32 w-full overflow-hidden rounded-lg bg-accent/10 p-2">
        {geo ? (
          <>
            <svg
              viewBox={`0 0 ${geo.W} ${geo.H}`}
              className="h-full w-full overflow-visible"
              role="img"
              aria-label={`${title}. ${range}, ${frequency}. Low ${fmt(geo.min)}, high ${fmt(geo.max)} ${unit}. A table of the data is available.`}
              onMouseLeave={() => setHover(null)}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const px = ((e.clientX - r.left) / r.width) * geo.W;
                const i = Math.round(((px - geo.padL) / (geo.W - geo.padL)) * (points.length - 1));
                setHover(Math.min(points.length - 1, Math.max(0, i)));
              }}
            >
              <text x="0" y="12" className="fill-muted-foreground" fontSize="9">{fmt(geo.max)}</text>
              <text x="0" y={geo.H - 6} className="fill-muted-foreground" fontSize="9">{fmt(geo.min)}</text>
              <path id={uid} d={geo.d} fill="none" stroke="currentColor" className="text-blue-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Marker on the latest point so the series end is not colour-only. */}
              <rect x={geo.x(points.length - 1) - 3} y={geo.y(points[points.length - 1].value) - 3} width="6" height="6" className="fill-blue-600" />
              {hi ? (
                <>
                  <line x1={geo.x(hover!)} x2={geo.x(hover!)} y1="0" y2={geo.H} stroke="currentColor" className="text-muted-foreground" strokeDasharray="3 3" />
                  <circle cx={geo.x(hover!)} cy={geo.y(hi.value)} r="3.5" className="fill-background stroke-blue-600" strokeWidth="2" />
                </>
              ) : null}
            </svg>
            {hi && first != null ? (
              <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-border bg-card/95 px-2 py-1 text-xs shadow">
                <p className="font-medium">{fmtWhen(hi.ts, intraday)}</p>
                <p className="tabular-nums">{fmt(hi.value)} {unit}</p>
                <p>vs first point: <SignedPct value={(hi.value - first) / first} /></p>
                <p className="text-muted-foreground">{sourceStatus}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {loading ? "Loading chart data…" : (emptyMessage ?? "No data for this range. The market may be closed or the feed unavailable.")}
          </div>
        )}
      </div>

      {geo ? (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button type="button" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="text-primary underline-offset-2 hover:underline">
            {showTable ? "Hide data table" : "View as table"}
          </button>
          <button type="button" onClick={download} className="text-primary underline-offset-2 hover:underline">Download CSV</button>
        </div>
      ) : null}

      {showTable && geo ? (
        <div className="max-h-56 overflow-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <caption className="sr-only">{title}: {range}, {frequency}</caption>
            <thead className="sticky top-0 bg-muted text-left">
              <tr>
                <th scope="col" className="px-2 py-1 font-medium">Time (IST)</th>
                <th scope="col" className="px-2 py-1 text-right font-medium">Value ({unit})</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.ts} className="border-t border-border/50">
                  <th scope="row" className="px-2 py-1 text-left font-normal">{fmtWhen(p.ts, intraday)}</th>
                  <td className="px-2 py-1 text-right tabular-nums">{fmt(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </figure>
  );
}
