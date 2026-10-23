"use client";
import { usePathname } from "next/navigation";
import { chartsForPath } from "@/lib/ts-charts/registry";
import { RangeProvider } from "./range-context";
import { TsRange } from "./ts-range";
import { TsChart } from "./ts-chart";
import { LazyMount } from "./lazy-mount";
import { TsEvents } from "./ts-events";
import { TsStatusBadge } from "./ts-status-badge";

/** Appends the registry's long-history charts for the current route (CLAUDE_BUILD_SPEC §2). Renders nothing on routes without charts. */
export function TsRoutePanel() {
  const path = (usePathname() ?? "").replace(/\/$/, "") || "/";
  if (path === "/Home") return null; // Home composes its own section
  const defs = chartsForPath(path);
  const showEvents = path === "/macro/india" || path === "/macro/calendar";
  if (!defs.length && !showEvents) return null;
  return (
    <RangeProvider initial="10Y">
      <section aria-label="Long-run data" className="mx-auto mt-8 max-w-[1440px] space-y-4 px-3 pb-12 sm:px-6" style={{ color: "var(--ink)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 py-2" style={{ background: "var(--paper)" }}>
          <h2 className="text-xl font-semibold tracking-tight">Long-run data</h2>
          <div className="flex items-center gap-3"><TsStatusBadge /><TsRange spanYears={30} /></div>
        </div>
        {showEvents && <TsEvents days={30} title="Upcoming holidays and corporate actions" />}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {defs.map((d) => <LazyMount key={d.id}><TsChart id={d.id} /></LazyMount>)}
        </div>
      </section>
    </RangeProvider>
  );
}
