"use client";

import { DataInfo } from "@/components/feeds/data-info";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import type { FlagCandidate, OptionsFlowRecord, SourcedField } from "./types";
import { CONFIDENCE_STYLE } from "./types";
import { signClass } from "@/lib/sign-color";

function Figure({ label, field, fmt, signed = false }: { label: string; field: SourcedField<number>; fmt: (v: number) => string; signed?: boolean }) {
  return (
    <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        {field.status === "ok" ? (
          <span className={cn("inline-flex items-center gap-1", signed && signClass(field.value))}>
            {fmt(field.value)}
            <DataInfo source={field.source} />
          </span>
        ) : (
          <span className="text-muted-foreground/60" title={field.reason}>
            —
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * One shortlisted ticker. A research card, not a trade ticket: it explains in plain words
 * why the flagging agent picked it, shows the figures behind the call, and points at the
 * research page so the user can go look at the company themselves.
 */
export function FlagCard({
  candidate,
  index,
  record,
}: {
  candidate: FlagCandidate;
  index: number;
  record: OptionsFlowRecord | undefined;
}) {
  return (
    <article className="space-y-3 rounded-xl border border-blue-600/30 bg-blue-600/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-bold">
          <span className="mr-2 text-blue-700">#{index + 1}</span>
          {candidate.symbol}
        </h4>
        <Badge className={cn("uppercase", CONFIDENCE_STYLE[candidate.confidence])}>
          {candidate.confidence} confidence
        </Badge>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why it got flagged</p>
        <p className="mt-0.5 text-sm">{candidate.whatIsUnusual}</p>
      </div>

      {record ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Price" field={record.price} fmt={(v) => `₹${v.toFixed(2)}`} />
          <Figure
            label="Day change"
            field={record.priceChangePct}
            signed
            fmt={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`}
          />
          <Figure label="Call volume" field={record.callsVolume} fmt={(v) => v.toLocaleString("en-IN")} />
          <Figure label="Put volume" field={record.putsVolume} fmt={(v) => v.toLocaleString("en-IN")} />
        </div>
      ) : null}

      <dl className="space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-muted-foreground">New positions?</dt>
          <dd>{candidate.openInterestConfirmsOpened ? "Yes — open interest rose with the volume." : "No — volume without rising open interest."}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-muted-foreground">Boring explanation</dt>
          <dd>{candidate.boringExplanation}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-muted-foreground">To find out</dt>
          <dd>{candidate.whatToFindOut}</dd>
        </div>
      </dl>

      <Link
        href={`/research/${encodeURIComponent(candidate.symbol)}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-600/10"
      >
        <Search className="size-3.5" />
        Go look at the company
        <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
}
