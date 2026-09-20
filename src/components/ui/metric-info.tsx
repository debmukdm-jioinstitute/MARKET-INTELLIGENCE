"use client";

import { useState } from "react";
import { getMetric, type MetricDefinition } from "@/lib/metrics-catalog";
import type { FieldSource } from "@/lib/feeds/india/types";
import { Info, X, ExternalLink, Calculator, BookOpen, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricInfoProps {
  id?: string;
  metric?: string;
  name?: string;
  customTitle?: string;
  provider?: string;
  sourceUrl?: string;
  asOf?: string;
  sourceOverride?: FieldSource;
  calculation?: string;
  laymanExplanation?: string;
  utility?: string;
  className?: string;
  size?: "xs" | "sm" | "md";
  iconSize?: "xs" | "sm" | "md";
}

export function MetricInfo({
  id,
  metric,
  name,
  customTitle,
  provider: propProvider,
  sourceUrl: propUrl,
  asOf: propAsOf,
  sourceOverride,
  calculation: propCalculation,
  laymanExplanation: propLayman,
  utility: propUtility,
  className,
  size = "sm",
  iconSize,
}: MetricInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const metricKey = id ?? metric ?? "data_quality";
  const def: MetricDefinition = getMetric(metricKey);

  const title = name ?? customTitle ?? def.name;
  const provider = propProvider ?? sourceOverride?.provider ?? def.provider;
  const url = propUrl ?? sourceOverride?.url ?? def.defaultUrl;
  const asOf = propAsOf ?? (sourceOverride?.asOf ? new Date(sourceOverride.asOf).toLocaleString() : "Live session timestamp");
  const calculation = propCalculation ?? def.calculation;
  const laymanExplanation = propLayman ?? def.laymanExplanation;
  const utility = propUtility ?? def.utility;
  const effectiveSize = iconSize ?? size;

  const sizeClasses = {
    xs: "text-[10px]",
    sm: "text-[12px]",
    md: "text-[14px]",
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/80 hover:bg-primary/20 hover:text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary ml-1",
          className,
        )}
        aria-label={`Data provenance and calculation for ${title}`}
        title="Click for exact official data source, calculation formula, and layman explanation"
      >
        <span className={cn("font-serif italic font-bold leading-none select-none hover:scale-110 transition-transform", sizeClasses[effectiveSize])}>
          ⓘ
        </span>
      </button>

      {/* Modal Dialog */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-border/90 bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary uppercase">
                    {def.category}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold">
                    <ShieldCheck className="size-3" />
                    Verified Official Stream
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mt-1">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content Sections */}
            <div className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto pr-1 font-sans">
              {/* 1. Exact Source Box */}
              <div className="rounded-xl border border-border/80 bg-accent/20 p-3.5 space-y-1.5 font-mono">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3 text-primary" />
                  EXACT OFFICIAL SOURCE & REPUTABLE PROVENANCE
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <span className="font-semibold text-foreground">{provider}</span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-bold"
                    >
                      View Source Endpoint <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
                <p className="text-[10px] text-muted-foreground pt-0.5">
                  Last verified fetch / As of: <span className="text-foreground">{asOf}</span>
                </p>
              </div>

              {/* 2. Layman's Explanation */}
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1.5 font-mono">
                  <BookOpen className="size-3.5" />
                  WHAT IT MEANS IN LAYMAN'S TERMS (SIMPLE ENGLISH)
                </span>
                <p className="text-foreground text-xs leading-relaxed">
                  {laymanExplanation}
                </p>
              </div>

              {/* 3. Mathematical Formula & Calculation */}
              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1.5 font-mono">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <Calculator className="size-3.5 text-primary" />
                  CALCULATION METHODOLOGY & MATHEMATICAL FORMULA
                </span>
                <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-foreground leading-relaxed border border-border/50">
                  {calculation}
                </div>
              </div>

              {/* 4. Practical Utility & Actionable Guide */}
              <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block font-mono">
                  HOW INVESTORS & RISK MANAGERS USE THIS NUMBER
                </span>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {utility}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
