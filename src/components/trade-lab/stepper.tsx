"use client";

import { cn } from "@/lib/utils";
import { Fragment } from "react";

export const TRADE_LAB_STEPS = [
  { id: 1, label: "Instrument", hint: "Pick a stock or index" },
  { id: 2, label: "Verdict", hint: "How readings stack up" },
  { id: 3, label: "Indicators", hint: "The maths, card by card" },
  { id: 4, label: "Patterns", hint: "Shapes in the candles" },
  { id: 5, label: "Backtest", hint: "Test a fixed rule" },
] as const;

/**
 * Guided-journey progress rail. Desktop: numbered rail with labels.
 * Mobile: compact "Step X of 5" header with a progress bar and tappable segments.
 * Every step is always reachable — steps without data show a friendly prompt.
 */
export function TradeLabStepper({ step, onStep }: { step: number; onStep: (s: number) => void }) {
  const current = TRADE_LAB_STEPS[step - 1] ?? TRADE_LAB_STEPS[0];
  return (
    <nav aria-label="Trade Lab steps" className="rounded-xl border border-border bg-background px-4 py-3">
      {/* Mobile: compact progress bar */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-bold text-foreground">
            Step {step} of {TRADE_LAB_STEPS.length} · {current.label}
          </div>
          <div className="text-xs text-muted-foreground">{current.hint}</div>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={TRADE_LAB_STEPS.length}
          aria-label={`Step ${step} of ${TRADE_LAB_STEPS.length}`}
        >
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(step / TRADE_LAB_STEPS.length) * 100}%` }} />
        </div>
        <div className="mt-2 flex gap-1.5">
          {TRADE_LAB_STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStep(s.id)}
              aria-label={`Go to step ${s.id}: ${s.label}`}
              aria-current={step === s.id ? "step" : undefined}
              className={cn("h-8 flex-1 rounded-md", step === s.id ? "bg-primary/20" : step > s.id ? "bg-primary/10" : "bg-muted")}
            >
              <span className={cn("text-[11px] font-bold", step === s.id ? "text-primary" : "text-muted-foreground")}>{s.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: numbered rail */}
      <ol className="hidden items-stretch sm:flex">
        {TRADE_LAB_STEPS.map((s, i) => (
          <Fragment key={s.id}>
            {i > 0 ? (
              <li aria-hidden className="flex items-center px-1">
                <div className={cn("h-0.5 w-6 rounded-full lg:w-10", step > s.id - 1 ? "bg-primary/60" : "bg-border")} />
              </li>
            ) : null}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => onStep(s.id)}
                aria-current={step === s.id ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  step === s.id ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                    step === s.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : step > s.id
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                  )}
                >
                  {s.id}
                </span>
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-semibold", step === s.id ? "text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">{s.hint}</span>
                </span>
              </button>
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
