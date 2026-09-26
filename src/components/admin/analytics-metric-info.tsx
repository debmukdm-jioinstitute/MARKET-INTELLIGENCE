"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ANALYTICS_METRIC_DOCS,
  metricDisplayEmptyReason,
  type AnalyticsMetricDoc,
} from "@/lib/admin/analytics-metric-docs";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { useState } from "react";

export function AnalyticsMetricInfo({
  metricKey,
  label,
  formattedValue,
  rawValue,
  extraHint,
  doc: docOverride,
  className,
}: {
  metricKey: string;
  label: string;
  formattedValue: string;
  rawValue: number | string | null | undefined;
  extraHint?: string;
  doc?: AnalyticsMetricDoc;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const doc = docOverride ?? ANALYTICS_METRIC_DOCS[metricKey];
  const emptyReason = metricDisplayEmptyReason(metricKey, rawValue, doc);

  if (!doc && !extraHint && !emptyReason) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40",
            className,
          )}
          aria-label={`How ${label} is calculated`}
        >
          <Info className="size-3.5" strokeWidth={2.25} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="z-50 w-[min(22rem,94vw)] rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 shadow-lg"
      >
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="mt-1 text-xs text-gray-500">
          Current value: <span className="tabular-nums font-medium text-gray-700">{formattedValue}</span>
        </p>

        {doc?.calculation ? (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">How it&apos;s calculated</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-700">{doc.calculation}</p>
          </div>
        ) : null}

        {doc?.insight ? (
          <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/80 px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Insight</p>
            <p className="mt-0.5 text-xs leading-relaxed text-blue-900">{doc.insight}</p>
          </div>
        ) : null}

        {emptyReason ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Why empty or zero</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-950">{emptyReason}</p>
          </div>
        ) : null}

        {extraHint ? (
          <p className="mt-3 text-xs leading-relaxed text-gray-500">{extraHint}</p>
        ) : null}

        {!doc ? (
          <p className="mt-3 text-xs text-gray-500">Documentation for this key is being added.</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
