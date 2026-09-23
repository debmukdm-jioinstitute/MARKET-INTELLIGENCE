"use client";

import { useMathInspector } from "@/components/providers/math-inspector-provider";
import { GLOSSARY } from "@/lib/my-portfolio/glossary";
import { cn } from "@/lib/utils";

export function MetricInfo({
  id,
  value,
  contextData,
  className,
}: {
  id: string;
  value?: string | number | null;
  contextData?: Record<string, any>;
  className?: string;
}) {
  const { openInspector } = useMathInspector();
  const entry = GLOSSARY[id];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openInspector({
          metricId: id,
          title: entry?.label ?? id,
          currentValue: value,
          contextData,
          category: "Portfolio Analytics",
        });
      }}
      className={cn(
        "ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/80 hover:bg-blue-600/20 hover:text-blue-600 transition-all focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer",
        className
      )}
      aria-label={`View mathematical derivation for ${entry?.label ?? id}`}
      title="Click for full LaTeX mathematical derivation, inputs, and institutional proof"
    >
      <span className="font-serif italic text-[11px] font-bold leading-none select-none hover:scale-125 transition-transform">
        ⓘ
      </span>
    </button>
  );
}
