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
          <span className="font-sans italic font-bold text-[12px] leading-none select-none hover:scale-125 transition-transform">
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3.5">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="size-3 text-primary shrink-0" />
              <span>Official Data Provenance</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verified Live</span>
            </div>
          </div>

          {/* Title if provided */}
          {name ? (
            <h4 className="text-sm font-bold text-foreground leading-snug tracking-tight">
              {name}
            </h4>
          ) : null}

          {/* Provider Card */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground shrink-0">
                <Database className="size-3.5 text-primary shrink-0" />
                <span>Source Agency</span>
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

          {/* Timestamps */}
          {(marketTime || hubTime) ? (
            <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/50 p-2.5 text-[10.5px] text-muted-foreground">
              {marketTime ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 shrink-0" />
                    <span>Market / Field As Of</span>
                  </span>
                  <span className="font-sans tabular-nums text-foreground font-medium">{marketTime}</span>
                </div>
              ) : null}
              {hubTime ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 shrink-0" />
                    <span>Hub Synchronization</span>
                  </span>
                  <span className="font-sans tabular-nums text-foreground font-medium">{hubTime}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Note / Details */}
          {note ? (
            <div className="rounded-xl border border-border/50 bg-card/60 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
              {note}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
