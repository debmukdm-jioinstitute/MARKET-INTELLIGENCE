"use client";

import type { FieldSource } from "@/lib/feeds/india/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useState } from "react";

export function DataInfo({
  source,
  hubSyncedAt,
  note,
}: {
  source: FieldSource;
  hubSyncedAt?: string;
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const marketTime = source.asOf ? new Date(source.asOf).toLocaleString() : null;
  const hubTime = hubSyncedAt ? new Date(hubSyncedAt).toLocaleString() : null;

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Data source and freshness"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[260px] flex-col items-start gap-1.5 p-3 text-left font-normal"
      >
        <p className="font-semibold">Data provenance</p>
        <p>
          Source:{" "}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
            {source.provider}
          </a>
        </p>
        <p>Market / field time: {marketTime ?? "—"}</p>
        <p>Last hub fetch: {hubTime ?? "—"}</p>
        {note ? <p className="text-muted-foreground">{note}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}
