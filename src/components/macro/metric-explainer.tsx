"use client";

import * as React from "react";
import { METRIC_COPY } from "@/lib/macro/metric-copy";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, Database, Globe, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricExplainer({ copyKey, className }: { copyKey: string; className?: string }) {
  const copy =
    METRIC_COPY[copyKey] ?? {
      novice: "Live or delayed quote from open market data. Day change is vs the previous close.",
      provider: "Yahoo Finance / exchange feeds",
      url: "https://finance.yahoo.com/",
    };
  const [open, setOpen] = React.useState(false);

  let cleanHost = "Official Feed";
  try {
    if (copy.url && copy.url.startsWith("http")) {
      cleanHost = new URL(copy.url).hostname.replace(/^www\./, "");
    }
  } catch {
    cleanHost = "Live Source";
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/80 hover:bg-blue-600/20 hover:text-blue-500 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer select-none",
            className
          )}
          aria-label={`About ${copyKey}`}
          title={`Click to view data source and live link for ${copyKey}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span className="font-serif italic font-bold text-[12px] leading-none select-none hover:scale-125 transition-transform">
            ⓘ
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="z-50 w-76 max-w-[90vw] rounded-xl border border-border/80 bg-popover/95 p-3.5 text-popover-foreground shadow-2xl backdrop-blur-md ring-1 ring-border/50 text-xs duration-150 animate-in fade-in zoom-in-95"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary border-b border-border/50 pb-2">
            <ShieldCheck className="size-3 text-primary shrink-0" />
            <span>Macro Data Provenance</span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">In Plain English</p>
            <p className="text-muted-foreground leading-relaxed text-[11px]">{copy.novice}</p>
          </div>

          <div className="rounded-lg border border-border/70 bg-card/60 p-2.5 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground shrink-0">
                <Database className="size-3.5 text-primary shrink-0" />
                <span>Provider</span>
              </span>
              <span className="font-semibold text-foreground truncate text-right">
                {copy.provider}
              </span>
            </div>

            {copy.url ? (
              <a
                href={copy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-medium text-primary hover:bg-primary/20 hover:border-primary transition-all group"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Globe className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate font-semibold">Open Live Source ({cleanHost})</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
