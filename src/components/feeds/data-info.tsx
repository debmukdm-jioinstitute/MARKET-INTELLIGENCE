"use client";

import * as React from "react";
import type { FieldSource } from "@/lib/feeds/india/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, Database, Calendar, Clock, Globe, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function DataInfo({
  source,
  hubSyncedAt,
  note,
  name,
  className,
}: {
  source: FieldSource;
  hubSyncedAt?: string;
  note?: string;
  name?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const marketTime = source.asOf ? new Date(source.asOf).toLocaleString() : null;
  const hubTime = hubSyncedAt ? new Date(hubSyncedAt).toLocaleString() : null;

  let cleanHost = "Official Source";
  try {
    if (source.url && source.url.startsWith("http")) {
      cleanHost = new URL(source.url).hostname.replace(/^www\./, "");
    }
  } catch {
    cleanHost = "Live Feed";
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
          aria-label={`Data source and provenance for ${name ?? source.provider}`}
          title={`Click to view official data source and live link`}
          onClick={(e) => {
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary border-b border-border/50 pb-2">
            <ShieldCheck className="size-3 text-primary shrink-0" />
            <span>Official Data Provenance</span>
          </div>

          {name ? (
            <p className="font-bold text-foreground text-sm leading-snug">{name}</p>
          ) : null}

          <div className="rounded-lg border border-border/70 bg-card/60 p-2.5 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground shrink-0">
                <Database className="size-3.5 text-primary shrink-0" />
                <span>Provider</span>
              </span>
              <span className="font-semibold text-foreground truncate text-right">
                {source.provider}
              </span>
            </div>

            {source.url ? (
              <a
                href={source.url}
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

          <div className="space-y-1 text-[10px] text-muted-foreground">
            {marketTime ? (
              <p className="flex items-center gap-1">
                <Calendar className="size-3 shrink-0" />
                <span>Source date: <strong className="text-foreground">{marketTime}</strong></span>
              </p>
            ) : null}
            {hubTime ? (
              <p className="flex items-center gap-1">
                <Clock className="size-3 shrink-0" />
                <span>Hub sync: <strong className="text-foreground">{hubTime}</strong></span>
              </p>
            ) : null}
          </div>

          {note ? (
            <p className="border-t border-border/50 pt-2 text-[11px] text-muted-foreground leading-relaxed">
              {note}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
