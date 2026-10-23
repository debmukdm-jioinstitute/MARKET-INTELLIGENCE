"use client";
import dynamic from "next/dynamic";
import { useRange } from "./range-context";
import { applyTf, sliceRange } from "@/lib/ts-charts/transform";
import { ChartActions } from "./chart-actions";
import { useChartData } from "./use-chart-data";
import type { BarKind } from "./ts-bars";

const Skel = () => <div className="h-[220px] animate-pulse rounded sm:h-[320px]" style={{ background: "var(--paper-2)" }} />;
const TsLine = dynamic(() => import("./ts-line").then((m) => m.TsLine), { ssr: false, loading: Skel });
const TsBars = dynamic(() => import("./ts-bars").then((m) => m.TsBars), { ssr: false, loading: Skel });
const TsIndicator = dynamic(() => import("./ts-indicator").then((m) => m.TsIndicator), { ssr: false, loading: Skel });

/** The only chart component pages use: fetch by registry id, apply page range + transform, dispatch by kind. */
export function TsChart({ id, narrowAt = 456 }: { id: string; narrowAt?: number }) {
  const { from, to } = useRange();
  const { data, error } = useChartData(id);
  if (error) return <p className="text-sm" style={{ color: "var(--ink-3)" }}>Data unavailable right now.</p>;
  if (!data) return <Skel />;
  if (!data.rows.length) return <p className="text-sm" style={{ color: "var(--ink-3)" }}>Source unavailable: no observations stored yet.</p>;
  const cols = data.series.map((s) => s.col);
  const rows = applyTf(sliceRange(data.rows, from, to), cols, data.transform);
  const narrow = typeof window !== "undefined" && window.innerWidth < narrowAt;
  const recentFrom = rows.at(-Math.min(rows.length, 24))?.date ?? "";
  const band = data.band;
  return (
    <section id={id} className="space-y-1">
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>{data.title}</h3>
        <ChartActions id={id} title={data.title} rows={rows} />
      </header>
      {data.kind === "indicator" && band ? (
        <TsIndicator rows={rows.map((r) => ({ date: r.date, v: r[cols[0]] as number }))} recentFrom={recentFrom} band={band} fmt={data.fmt} digits={data.digits} />
      ) : data.kind === "line" ? (
        <TsLine rows={rows} series={data.series} band={band} fmt={data.fmt} digits={data.digits} narrow={narrow} />
      ) : (
        <TsBars kind={data.kind as BarKind} rows={rows} series={data.series} fmt={data.fmt} digits={data.digits} />
      )}
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        Source: {data.source} · updated {data.updated}
        {data.methodUrl && <> · <a className="underline" href={data.methodUrl}>method</a></>}
      </p>
    </section>
  );
}
