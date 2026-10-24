"use client";
import { useCallback, useState } from "react";
import { chartsForPath } from "@/lib/ts-charts/registry";
import { RangeProvider } from "./range-context";
import { TsRange } from "./ts-range";
import { TsChart } from "./ts-chart";
import { LazyMount } from "./lazy-mount";
import { TsStatusBadge } from "./ts-status-badge";

/** Long-history charts registered for a given original route (e.g. "/markets?section=valuation"). Renders nothing when none are registered. */
export function TsPathCharts({ path, title = "Long-run data", initial = "10Y" }: { path: string; title?: string; initial?: string }) {
  const defs = chartsForPath(path);
  const [empty, setEmpty] = useState<Record<string, boolean>>({});
  const onEmpty = useCallback((id: string, e: boolean) => setEmpty((m) => (m[id] === e ? m : { ...m, [id]: e })), []);
  // Every chart reported empty: drop the whole block rather than show a heading over placeholders.
  if (!defs.length || defs.every((d) => empty[d.id])) return null;
  return (
    <RangeProvider initial={initial}>
      <section aria-label={title} className="mt-6 space-y-4" style={{ color: "var(--ink)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <div className="flex items-center gap-3"><TsStatusBadge /><TsRange spanYears={30} /></div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {defs.map((d) => <LazyMount key={d.id}><TsChart id={d.id} onEmpty={onEmpty} /></LazyMount>)}
        </div>
      </section>
    </RangeProvider>
  );
}
