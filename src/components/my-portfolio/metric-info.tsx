"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GLOSSARY } from "@/lib/my-portfolio/glossary";
import { Info } from "lucide-react";

export function MetricInfo({ id }: { id: string }) {
  const entry = GLOSSARY[id];
  if (!entry) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`About ${entry.label}`}
        >
          <Info className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 text-left">
        <p className="font-heading text-sm font-semibold">{entry.label}</p>
        <p className="text-xs text-muted-foreground">{entry.definition}</p>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Formula</p>
          <p className="rounded bg-muted px-2 py-1 font-mono text-[11px]">{entry.formula}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Example</p>
          <p className="text-xs">{entry.example}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</p>
          <p className="text-xs">{entry.why}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
