"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { MetricEyeButton, isExplainable } from "@/components/my-portfolio/metric-explain-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GLOSSARY } from "@/lib/my-portfolio/glossary";
import { cn } from "@/lib/utils";

/**
 * Eye icon next to a portfolio metric. Alpha, beta and the other risk-adjusted ratios open the full
 * explainer built from the user's own returns; every other metric opens its glossary definition.
 * No example numbers are shown: nothing here is data unless it came from the user's portfolio.
 */
export function MetricInfo({ id, value, className }: { id: string; value?: string | number | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[id];

  if (isExplainable(id)) return <MetricEyeButton id={id} value={value == null ? "—" : String(value)} className={className} />;
  if (!entry) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`What ${entry.label} means`}
        title={`What ${entry.label} means`}
        className={cn(
          "ml-1 inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-blue-600/20 hover:text-blue-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600",
          className,
        )}
      >
        <Eye className="size-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-baseline gap-3">
              {entry.label}
              {value != null && value !== "" ? <span className="text-lg font-extrabold tabular-nums text-blue-600">{String(value)}</span> : null}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-stone-600">{entry.definition}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Why it matters</p>
              <p className="mt-1 text-stone-700">{entry.why}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">How it is calculated</p>
              <p className="mt-1 rounded-lg bg-stone-50 p-2.5 font-mono text-xs text-stone-700">{entry.formula}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
