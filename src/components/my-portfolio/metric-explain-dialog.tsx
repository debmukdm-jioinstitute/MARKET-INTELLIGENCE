"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import "katex/dist/katex.min.css";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Latex } from "@/components/ui/latex";
import { EXPLAIN_ALIAS, EXPLAINABLE, explainMetric } from "@/lib/my-portfolio/metric-explain";
import type { RegressionInputs } from "@/lib/my-portfolio/types";
import { cn } from "@/lib/utils";

export const isExplainable = (id: string) => EXPLAINABLE.has(EXPLAIN_ALIAS[id] ?? id);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 space-y-2">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{title}</h4>
      {children}
    </section>
  );
}

/** Eye icon that opens the definition, portfolio impact and (for alpha and beta) the worked derivation. */
export function MetricEyeButton({
  id,
  value,
  benchmark,
  regression,
  className,
}: {
  id: string;
  value: string;
  benchmark: string;
  regression?: RegressionInputs | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const info = open ? explainMetric(id, { value, benchmark, regression }) : null;
  if (!isExplainable(id)) return null;
  const label = explainMetric(id, { value, benchmark, regression: null })?.title ?? id;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`How ${label} is calculated`}
        title={`How ${label} is calculated`}
        className={cn(
          "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          className,
        )}
      >
        <Eye className="size-3.5" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] max-w-3xl grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden overflow-y-auto rounded-2xl p-0 sm:max-w-3xl">
          {info ? (
            <>
              <DialogHeader className="border-b border-stone-200 p-5 sm:p-6">
                <DialogTitle className="flex flex-wrap items-baseline gap-3 text-lg font-bold text-stone-900">
                  {info.title}
                  <span className="text-xl font-extrabold tabular-nums text-blue-600">{info.value}</span>
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-stone-600">{info.definition}</DialogDescription>
              </DialogHeader>

              <div className="min-w-0 space-y-6 p-5 sm:p-6">
                <Section title="What it means for your portfolio">
                  <ul className="space-y-2 text-sm leading-relaxed text-stone-700">
                    {info.impact.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="The formula">
                  <div className="overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <Latex block math={info.formula} />
                  </div>
                </Section>

                <Section title="Every term defined">
                  <dl className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                    {info.symbols.map((s) => (
                      <div key={s.symbol} className="grid grid-cols-[minmax(5rem,9rem)_1fr] items-baseline gap-3 px-3 py-2 text-sm">
                        <dt className="whitespace-nowrap"><Latex math={s.symbol} /></dt>
                        <dd className="min-w-0 break-words text-stone-700">
                          {s.meaning}
                          {s.value ? <span className="ml-2 whitespace-nowrap font-semibold tabular-nums text-stone-900">= {s.value}</span> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Section>

                {info.steps.length ? (
                  <Section title="Worked out with your numbers">
                    <ol className="space-y-3">
                      {info.steps.map((s, i) => (
                        <li key={s.title} className="rounded-xl border border-stone-200 p-3.5">
                          <p className="text-sm font-bold text-stone-900">
                            <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-blue-600 text-[11px] text-white">{i + 1}</span>
                            {s.title}
                          </p>
                          <div className="my-2 overflow-x-auto"><Latex block math={s.latex} /></div>
                          <p className="text-xs leading-relaxed text-stone-500">{s.note}</p>
                        </li>
                      ))}
                    </ol>
                  </Section>
                ) : (
                  <p className="rounded-xl bg-stone-50 p-3 text-xs text-stone-500">
                    A worked example appears here once your portfolio has enough price history to compute it.
                  </p>
                )}

                <Section title="Read with care">
                  <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-stone-500">
                    {info.caveats.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </Section>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
