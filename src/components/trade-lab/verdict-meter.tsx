"use client";

import { cn } from "@/lib/utils";
import type { IndicatorReading, LabResult, PatternHit } from "@/lib/trade-lab/types";
import { useEffect, useState } from "react";

const biasText: Record<string, string> = { bullish: "text-emerald-600", bearish: "text-rose-600", neutral: "text-muted-foreground" };
const biasBadge: Record<string, string> = {
  bullish: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  bearish: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
};
const biasLabel: Record<string, string> = { bullish: "Bullish", bearish: "Bearish", neutral: "Neutral" };

/** Big animated bull/bear/neutral agreement meter. Re-animates per instrument via animKey. */
export function VerdictMeter({ verdict, animKey }: { verdict: LabResult["verdict"]; animKey: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, [animKey]);

  const total = Math.max(1, verdict.total);
  const b = (verdict.bullish / total) * 100;
  const n = (verdict.neutral / total) * 100;
  const be = (verdict.bearish / total) * 100;
  const bar = (w: number, cls: string) => (
    <div className={cn("h-full transition-[width] duration-700 ease-out", cls)} style={{ width: on ? `${w}%` : "0%" }} />
  );

  return (
    <div>
      <div className={cn("text-2xl font-bold sm:text-3xl", biasText[verdict.bias])}>{verdict.label}</div>
      <div className="mt-3 flex h-5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${verdict.bullish} bullish, ${verdict.neutral} neutral, ${verdict.bearish} bearish of ${verdict.total} readings`}>
        {bar(b, "bg-emerald-500")}
        {bar(n, "bg-slate-400")}
        {bar(be, "bg-rose-500")}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Bullish {verdict.bullish}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden /> Neutral {verdict.neutral}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 font-semibold text-rose-700">
          <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden /> Bearish {verdict.bearish}
        </span>
      </div>
      <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5">
        <p className="text-sm font-semibold text-foreground">
          Agreement is not prediction.
        </p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          This is a count of {verdict.total} indicator and pattern readings (ATR excluded — it measures size of moves, not direction).
          More readings on one side does not mean the price will move that way.
        </p>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Each verdict reason expands to the numbers behind it: the matching
 * indicator's value, plain-English reading and exact rule — or the
 * matching pattern's numbers and rule.
 */
export function ReasonsAccordion({ data }: { data: LabResult }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!data.reasons.length) {
    return <p className="text-sm text-muted-foreground">No directional readings fired on the latest bar — every reading is neutral.</p>;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {data.reasons.map((r, i) => {
        const ind: IndicatorReading | undefined = data.indicators.find((x) => x.label === r.source);
        const pat: PatternHit | undefined = data.patterns.find((x) => x.name === r.source);
        const isOpen = open === i;
        return (
          <li key={`${r.source}-${i}`} className="bg-background">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left hover:bg-muted/50"
            >
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold", biasBadge[r.bias])}>
                {biasLabel[r.bias]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{r.source}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.text}</span>
              </span>
              <Chevron open={isOpen} />
            </button>
            {isOpen ? (
              <div className="border-t border-border bg-muted/40 px-3.5 py-3">
                {ind ? (
                  <div>
                    <div className="text-xl font-bold tabular-nums text-foreground">{ind.value}</div>
                    {ind.detail.length ? <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{ind.detail.join(" · ")}</div> : null}
                    <p className="mt-1.5 text-sm leading-snug text-foreground">{ind.reading}</p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Rule: {ind.rule}</p>
                  </div>
                ) : pat ? (
                  <div>
                    <p className="text-sm leading-snug text-foreground">{pat.why}</p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">{pat.numbers.join(" · ")}</p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Rule: {pat.rule}</p>
                  </div>
                ) : (
                  <p className="text-sm leading-snug text-foreground">{r.text}</p>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
