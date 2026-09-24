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
  Sparkles,
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
      cleanHost = "Internal Telemetry";
    }
  } catch {
    cleanHost = "Live Source";
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
        sideOffset={8}
        collisionPadding={16}
        className="z-50 w-[360px] sm:w-[400px] max-w-[94vw] rounded-2xl border border-border/80 bg-card/95 p-5 text-card-foreground shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl ring-1 ring-border/50 text-xs duration-200 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          {/* Top Bar: Category Pill & Live Badge */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="size-3 text-primary shrink-0" />
              <span className="truncate">{def.category ?? "Official Macro Telemetry"}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Provenance</span>
            </div>
          </div>

          {/* Title & Value Block */}
          <div className="space-y-2">
            <h4 className="text-base font-bold text-foreground leading-snug tracking-tight">
              {title}
            </h4>

            {formattedValue ? (
              <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 flex flex-wrap items-baseline justify-between gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Current Print / Level
                </span>
                <span className="font-mono text-xs font-bold text-foreground break-words">
                  {formattedValue}
                </span>
              </div>
            ) : null}
          </div>

          {/* Official Source Card */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground shrink-0">
                <Database className="size-3.5 text-primary shrink-0" />
                <span>Primary Agency</span>
              </span>
              <span className="font-semibold text-foreground text-right truncate">
                {effectiveProvider}
              </span>
            </div>

            {effectiveAsOf ? (
              <div className="flex items-center justify-between text-[11px] gap-2">
                <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Release / As of</span>
                </span>
                <span className="font-mono text-foreground truncate text-right">
                  {effectiveAsOf}
                </span>
              </div>
            ) : null}

            {/* Prominent Live Link Button */}
            {effectiveUrl ? (
              <a
                href={effectiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 hover:border-primary/60 px-3 py-2 text-xs font-semibold text-primary transition-all duration-150 group shadow-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flex items-center gap-2 truncate">
                  <Globe className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">Visit Official Source ({cleanHost})</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ) : null}
          </div>

          {/* Description & Meaning */}
          {effectiveExplanation ? (
            <div className="space-y-1.5 rounded-xl border border-border/50 bg-card/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-primary/80" />
                <span>Context & Meaning</span>
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11.5px]">
                {effectiveExplanation}
              </p>
            </div>
          ) : null}

          {/* Methodology & Calculation */}
          {effectiveCalculation ? (
            <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Calculation & Methodology
              </p>
              <p className="font-mono text-[10.5px] text-foreground leading-relaxed break-words">
                {effectiveCalculation}
              </p>
            </div>
          ) : null}

          {/* Institutional Utility Callout */}
          {effectiveUtility ? (
            <div className="rounded-r-lg border-l-2 border-primary bg-primary/5 p-2.5 text-[11px] italic text-muted-foreground/90 leading-relaxed">
              <span>{effectiveUtility}</span>
            </div>
          ) : null}

          {/* Institutional Math Proof Action */}
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
              className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-muted/20 hover:bg-accent/60 p-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all duration-150 group cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Calculator className="size-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span>Quantitative Math Proof & Variables</span>
              </span>
              <ChevronRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
