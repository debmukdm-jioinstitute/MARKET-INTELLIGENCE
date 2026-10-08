"use client";

import { MetricEyeButton, isExplainable } from "@/components/my-portfolio/metric-explain-dialog";
import { MetricInfo } from "@/components/my-portfolio/metric-info";
import type { MetricCategory, RegressionInputs } from "@/lib/my-portfolio/types";
import { cn } from "@/lib/utils";

const TONE = { up: "text-emerald-600", down: "text-[#E11D48]", warn: "text-blue-600", neutral: "text-stone-900" } as const;

/** Every portfolio metric, one bento card per category, a tile per metric with its eye icon. */
export function MetricsBento({
  categories,
  benchmark,
  regression,
}: {
  categories: MetricCategory[];
  benchmark: string;
  regression?: RegressionInputs | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {categories.map((cat) => (
        <section key={cat.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs sm:p-5">
          <h4 className="mb-3 text-sm font-bold text-stone-900">{cat.title}</h4>
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
            {cat.metrics.map((m) => (
              <div key={m.id} className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 transition-colors hover:bg-stone-50">
                <div className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight text-stone-500">
                  <span className="truncate">{m.label}</span>
                  {isExplainable(m.id) ? (
                    <MetricEyeButton id={m.id} value={m.formatted} benchmark={benchmark} regression={regression} />
                  ) : (
                    <MetricInfo id={m.id} value={m.formatted} className="size-5" />
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1 text-base font-extrabold tabular-nums",
                    m.status === "na" ? "text-stone-300" : TONE[m.tone ?? "neutral"],
                  )}
                >
                  {m.status === "na" ? "N/A" : m.formatted}
                </p>
                {m.status === "approx" ? <p className="text-[10px] font-medium uppercase text-stone-400">approx</p> : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
