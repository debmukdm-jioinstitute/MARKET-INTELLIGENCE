"use client";

import { METRIC_COPY } from "@/lib/macro/metric-copy";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useState } from "react";

export function MetricExplainer({ copyKey, className }: { copyKey: string; className?: string }) {
  const copy =
    METRIC_COPY[copyKey] ?? {
      novice: "Live or delayed quote from open market data. Day change is vs the previous close.",
      provider: "Yahoo Finance / exchange feeds",
      url: "https://finance.yahoo.com/",
    };
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={className ?? "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"}
          aria-label={`About ${copyKey}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] flex-col items-start gap-2 p-3 text-left text-xs font-normal">
        <p className="font-semibold text-foreground">In plain English</p>
        <p className="text-muted-foreground leading-relaxed">{copy.novice}</p>
        <p>
          Source:{" "}
          <a href={copy.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            {copy.provider}
          </a>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
