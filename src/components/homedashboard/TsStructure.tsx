"use client";
import { RangeProvider } from "@/components/ts-charts/range-context";
import { TsRange } from "@/components/ts-charts/ts-range";
import { TsChart } from "@/components/ts-charts/ts-chart";
import { LazyMount } from "@/components/ts-charts/lazy-mount";
import { TsEvents } from "@/components/ts-charts/ts-events";
import { TsStatusBadge } from "@/components/ts-charts/ts-status-badge";

/** Home: long-history flow + breadth charts from the ts-ingest datasets. Charts say "Source unavailable" until data is ingested. */
export function TsStructure() {
  return (
    <RangeProvider initial="1Y">
      <section aria-labelledby="ts-structure" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ts-structure" className="text-xl font-semibold tracking-tight">Flows and breadth</h2>
          <div className="flex items-center gap-3"><TsStatusBadge /><TsRange spanYears={5} /></div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <LazyMount><TsChart id="flows.cum_by_type" /></LazyMount>
          <LazyMount><TsChart id="mk.advances_declines" /></LazyMount>
        </div>
        <TsEvents days={7} title="This week: holidays and corporate actions" />
      </section>
    </RangeProvider>
  );
}
