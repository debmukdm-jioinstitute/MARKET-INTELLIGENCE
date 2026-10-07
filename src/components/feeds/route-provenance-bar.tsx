"use client";

import { DataInfo } from "@/components/feeds/data-info";
import { FeedSourceInfo } from "@/components/feeds/feed-source-info";
import {
  chipLabel,
  resolvePageProvenance,
} from "@/lib/feeds/page-provenance";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Route-level external data sources — shown on every portal page (except profile). */
export function RouteProvenanceBar() {
  const path = usePathname();
  const resolved = resolvePageProvenance(path);
  if (!resolved) return null;

  return (
    <div
      className="portal-header-enter mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-sm text-muted-foreground"
      role="region"
      aria-label="External data sources on this page"
    >
      <span className="font-semibold text-foreground shrink-0">Data sources:</span>
      <span className="hidden sm:inline max-w-md truncate">{resolved.summary}</span>
      <span className="flex flex-wrap items-center gap-0.5">
        {resolved.chips.map((chip, i) =>
          chip.kind === "feed" ? (
            <FeedSourceInfo
              key={`${chip.sourceId}-${i}`}
              sourceId={chip.sourceId}
              name={chipLabel(chip)}
              className="scale-90"
            />
          ) : (
            <DataInfo
              key={`${chip.label}-${i}`}
              name={chip.label}
              source={chip.source}
              fetchPath={chip.fetchMethod}
              className="scale-90"
            />
          ),
        )}
      </span>
      <Link href="/data/feeds" className="ml-auto shrink-0 font-medium text-primary hover:underline">
        All feeds →
      </Link>
    </div>
  );
}
