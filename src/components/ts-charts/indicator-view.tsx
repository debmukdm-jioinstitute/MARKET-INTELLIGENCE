"use client";
import { RangeProvider } from "./range-context";
import { TsRange } from "./ts-range";
import { TsChart } from "./ts-chart";
import { useChartData } from "./use-chart-data";
import { fmtVal } from "@/lib/ts-charts/format";

function Reading({ id, slug }: { id: string; slug: string }) {
  const { data } = useChartData(id);
  if (!data || !data.rows.length || !data.band) return null;
  const col = data.series[0].col;
  const last = [...data.rows].reverse().find((r) => r[col] != null);
  if (!last) return null;
  const v = last[col] as number;
  const [lo, hi] = data.band;
  const pos = v > hi ? "above" : v < lo ? "below" : "inside";
  const f = (n: number) => fmtVal(n, data.fmt, data.digits);
  return (
    <div className="space-y-2">
      <p className="text-base" style={{ color: "var(--ink)" }}>
        Latest reading <b>{f(v)}</b> on {String(last.date)}: <b>{pos}</b> its usual range of {f(lo)} to {f(hi)}.
        {data.records && <> All-time high {f(data.records.hi.v)} ({data.records.hi.date}); low {f(data.records.lo.v)} ({data.records.lo.date}).</>}
      </p>
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        Usual range = 10th to 90th percentile of the full stored history (monthly-resampled). Source: {data.source}.{" "}
        <a className="underline" href={`/api/ts/i/${slug}/data.csv`}>Download CSV</a>
      </p>
    </div>
  );
}

export function IndicatorView({ id, slug }: { id: string; slug: string }) {
  return (
    <RangeProvider initial="All">
      <div className="space-y-4" style={{ color: "var(--ink)" }}>
        <div className="flex justify-end"><TsRange spanYears={30} /></div>
        <TsChart id={id} />
        <Reading id={id} slug={slug} />
      </div>
    </RangeProvider>
  );
}
