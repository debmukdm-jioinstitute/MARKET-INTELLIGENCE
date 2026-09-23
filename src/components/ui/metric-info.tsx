"use client";

import { useMathInspector } from "@/components/providers/math-inspector-provider";
import { getMetric, type MetricDefinition } from "@/lib/metrics-catalog";
import type { FieldSource } from "@/lib/feeds/india/types";
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
  value?: string | number | null;
  contextData?: Record<string, any>;
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
  value,
  contextData,
}: MetricInfoProps) {
  const { openInspector } = useMathInspector();
  const metricKey = id ?? metric ?? "data_quality";
  const def: MetricDefinition = getMetric(metricKey);

  const title = name ?? customTitle ?? def.name;
  const provider = propProvider ?? sourceOverride?.provider ?? def.provider;
  const effectiveSize = iconSize ?? size;

  const sizeClasses = {
    xs: "text-[10px]",
    sm: "text-[12px]",
    md: "text-[14px]",
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openInspector({
          metricId: metricKey,
          title,
          currentValue: value,
          contextData,
          source: sourceOverride ?? provider,
          category: def.category,
        });
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/80 hover:bg-blue-600/20 hover:text-blue-600 transition-all focus:outline-none focus:ring-1 focus:ring-blue-600 ml-1 cursor-pointer",
        className,
      )}
      aria-label={`Quantitative proof and calculation for ${title}`}
      title="Click for full LaTeX mathematical derivation, inputs, and institutional proof"
    >
      <span className={cn("font-serif italic font-bold leading-none select-none hover:scale-125 transition-transform", sizeClasses[effectiveSize])}>
        ⓘ
      </span>
    </button>
  );
}
