"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatAsOfIst, freshness } from "@/lib/provenance";
import { urlForSource } from "@/lib/panel-sources";
import { cn } from "@/lib/utils";
import { Eye, ExternalLink } from "lucide-react";
import Link from "next/link";

export type SourceEyeProps = {
  /** Provider name(s), e.g. "NSE shareholding filings (XBRL)". */
  source: string;
  /** What this figure is, shown as the popover heading. */
  label?: string;
  asOf?: string | null;
  /** Link that opens the original data so a user can verify it. */
  url?: string;
  /** Plain-language "how we got it". */
  method?: string;
  note?: string;
  className?: string;
};

/**
 * The "where does this number come from?" eye. Click it to see the provider, how fresh the data is,
 * how it was obtained, and a link to the original. Put it next to any figure or panel title.
 */
export function SourceEye({ source, label, asOf, url, method, note = "Not investment advice", className }: SourceEyeProps) {
  const href = url ?? urlForSource(source);
  const fresh = asOf ? freshness(asOf) : null;
  const when = asOf ? formatAsOfIst(asOf) : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Where this comes from${label ? `: ${label}` : ""}`}
          title="Where does this come from?"
          className={cn(
            "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            className,
          )}
        >
          <Eye className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" collisionPadding={16} className="w-[min(92vw,380px)] space-y-3 rounded-2xl p-4 text-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold leading-snug text-foreground">{label ?? "Where this comes from"}</p>
          {fresh ? (
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-xs font-medium", fresh.tone === "stale" ? "bg-rose-500/10 text-rose-600" : fresh.tone === "unknown" ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-700")}>{fresh.label}</span>
          ) : null}
        </div>
        <dl className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</dt>
            <dd className="font-medium text-foreground">{source}</dd>
          </div>
          {when ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data as of</dt>
              <dd className="tabular-nums text-foreground">{when}</dd>
            </div>
          ) : null}
          {method ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How we got it</dt>
              <dd className="leading-relaxed text-muted-foreground">{method}</dd>
            </div>
          ) : null}
        </dl>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-semibold text-primary hover:bg-primary/20">
            <span>Open the original source</span>
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {note} · <Link href="/methodology" className="underline-offset-2 hover:underline">Methodology</Link>
        </p>
      </PopoverContent>
    </Popover>
  );
}
