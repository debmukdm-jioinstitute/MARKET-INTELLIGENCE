"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMathInspector } from "@/components/providers/math-inspector-provider";
import { getMetric, type MetricDefinition } from "@/lib/metrics-catalog";
import type { FieldSource } from "@/lib/feeds/india/types";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  Database,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Calculator,
  Globe,
} from "lucide-react";

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
  hint?: string;
  details?: string;
  className?: string;
  size?: "xs" | "sm" | "md";
  iconSize?: "xs" | "sm" | "md";
  value?: string | number | null;
  unit?: string;
  contextData?: Record<string, any>;
  showInspectorButton?: boolean;
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
  hint,
  details,
  className,
  size = "sm",
  iconSize,
  value,
  unit,
  contextData,
  showInspectorButton = true,
}: MetricInfoProps) {
  const { openInspector } = useMathInspector();
  const [open, setOpen] = React.useState(false);

  const metricKey = id ?? metric ?? "data_quality";
  const def: MetricDefinition = getMetric(metricKey);

  const title = name ?? customTitle ?? def.name;
  const effectiveProvider = propProvider ?? sourceOverride?.provider ?? def.provider;
  const effectiveUrl = propUrl ?? sourceOverride?.url ?? def.defaultUrl;
  const effectiveAsOf = propAsOf ?? sourceOverride?.asOf;
  const effectiveExplanation = propLayman ?? hint ?? details ?? def.laymanExplanation;
  const effectiveCalculation = propCalculation ?? def.calculation;
  const effectiveUtility = propUtility ?? def.utility;

  const effectiveSize = iconSize ?? size;
  const sizeClasses = {
    xs: "text-[10px] size-3.5",
    sm: "text-[12px] size-4",
    md: "text-[14px] size-5",
  };

  let formattedValue: string | null = null;
  if (value != null) {
    if (typeof value === "number") {
      formattedValue = `${value.toFixed(2)}${unit ? " " + unit : ""}`;
    } else {
      formattedValue = String(value);
    }
  }

  let cleanHost = "Official Source";
  try {
    if (effectiveUrl && effectiveUrl.startsWith("http")) {
      cleanHost = new URL(effectiveUrl).hostname.replace(/^www\./, "");
    } else if (effectiveUrl && effectiveUrl.startsWith("/")) {
      cleanHost = "Market Intelligence";
    }
  } catch {
    cleanHost = "Live Feed";
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/80 hover:bg-blue-600/20 hover:text-blue-500 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 ml-1 cursor-pointer select-none",
            sizeClasses[effectiveSize],
            className
          )}
          aria-label={`Official source and details for ${title}`}
          title={`Click for official source, live link, and methodology for ${title}`}
        >
          <span className="font-serif italic font-bold leading-none select-none hover:scale-125 transition-transform">
            ⓘ
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="z-50 w-80 max-w-[92vw] rounded-xl border border-border/80 bg-popover/95 p-4 text-popover-foreground shadow-2xl backdrop-blur-md ring-1 ring-border/50 text-xs duration-150 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5">
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <ShieldCheck className="size-3 text-primary shrink-0" />
                <span className="truncate">{def.category ?? "Official Sovereign Telemetry"}</span>
              </div>
              <h4 className="mt-0.5 text-sm font-bold text-foreground leading-snug break-words">
                {title}
              </h4>
            </div>
            {formattedValue ? (
              <span className="shrink-0 rounded-md border border-border/80 bg-accent/40 px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                {formattedValue}
              </span>
            ) : null}
          </div>

          {/* Source Box & Live Link */}
          <div className="rounded-lg border border-border/70 bg-card/60 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground shrink-0">
                <Database className="size-3.5 text-primary shrink-0" />
                <span>Source</span>
              </span>
              <span className="font-semibold text-foreground text-right truncate">
                {effectiveProvider}
              </span>
            </div>

            {effectiveAsOf ? (
              <div className="flex items-center justify-between text-[11px] gap-2">
                <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <span>As of / Release</span>
                </span>
                <span className="font-mono text-foreground truncate text-right">{effectiveAsOf}</span>
              </div>
            ) : null}

            {/* Live Link Button */}
            {effectiveUrl ? (
              <a
                href={effectiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-medium text-primary hover:bg-primary/20 hover:border-primary transition-all group"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Globe className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate font-semibold">Visit Official Source ({cleanHost})</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ) : null}
          </div>

          {/* Details / Plain English Explanation */}
          {effectiveExplanation ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description & Meaning
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                {effectiveExplanation}
              </p>
            </div>
          ) : null}

          {/* Calculation / Methodology */}
          {effectiveCalculation ? (
            <div className="space-y-1 rounded bg-muted/40 p-2 border border-border/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Methodology & Computation
              </p>
              <p className="font-mono text-[10px] text-foreground leading-tight break-words">
                {effectiveCalculation}
              </p>
            </div>
          ) : null}

          {/* Economic / Institutional Utility */}
          {effectiveUtility ? (
            <div className="text-[10px] text-muted-foreground/90 italic border-l-2 border-primary/40 pl-2">
              <span>{effectiveUtility}</span>
            </div>
          ) : null}

          {/* Institutional Math Proof Button */}
          {showInspectorButton ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openInspector({
                  metricId: metricKey,
                  title,
                  currentValue: value,
                  contextData,
                  source: sourceOverride ?? effectiveProvider,
                  category: def.category,
                });
              }}
              className="flex w-full items-center justify-between border-t border-border/50 pt-2 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Calculator className="size-3.5 text-muted-foreground" />
                <span>Quantitative Math Proof & Variables</span>
              </span>
              <ChevronRight className="size-3.5" />
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
