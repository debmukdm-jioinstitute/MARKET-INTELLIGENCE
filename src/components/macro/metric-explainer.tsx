"use client";

import * as React from "react";
import { METRIC_COPY } from "@/lib/macro/metric-copy";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, Database, Globe, ShieldCheck, Sparkles } from "lucide-react";
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
        sideOffset={8}
        collisionPadding={16}
        className="z-50 w-[340px] sm:w-[380px] max-w-[94vw] rounded-2xl border border-border/80 bg-card/95 p-4 sm:p-5 text-card-foreground shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl ring-1 ring-border/50 text-xs duration-200 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="space-y-3.5">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="size-3 text-primary shrink-0" />
              <span>Macro Indicator Provenance</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Quote</span>
            </div>
          </div>

          {/* Plain English Meaning */}
          <div className="space-y-1.5 rounded-xl border border-border/50 bg-card/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-primary/80" />
              <span>In Plain English</span>
            </p>
            <p className="text-muted-foreground leading-relaxed text-[11.5px] font-normal">
              {copy.novice}
            </p>
          </div>

          {/* Provider Card */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground shrink-0">
                <Database className="size-3.5 text-primary shrink-0" />
                <span>Source Agency</span>
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
                className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 hover:border-primary/60 px-3 py-2 text-xs font-semibold text-primary transition-all duration-150 group shadow-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flex items-center gap-2 truncate">
                  <Globe className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">Open Live Source ({cleanHost})</span>
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
