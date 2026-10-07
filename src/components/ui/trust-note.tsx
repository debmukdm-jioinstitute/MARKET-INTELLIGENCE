"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataInfo } from "@/components/feeds/data-info";
import { FeedSourceInfo } from "@/components/feeds/feed-source-info";
import { cn } from "@/lib/utils";
import type { FeedSourceId } from "@/lib/feeds/types";
import type { FieldSource } from "@/lib/feeds/india/types";

function relative(iso: string, now: number): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * Point-of-use trust line: where the data came from, how fresh it is, how it is computed,
 * and that it is not advice. Place directly under the numbers it describes.
 */
export function TrustNote({
  source,
  asOf,
  delayed,
  note = "Not investment advice",
  methodology = "/methodology",
  className,
  fieldSource,
  fetchPath,
  feedSourceIds,
  hubSyncedAt,
}: {
  /** Provider name(s), e.g. "NSE India". */
  source: string;
  /** ISO timestamp of the underlying data. */
  asOf?: string | null;
  /** e.g. "15 min delayed". */
  delayed?: string;
  /** Closing caveat; defaults to the advice disclaimer. Use for modeled outputs. */
  note?: string;
  methodology?: string;
  className?: string;
  /** Full provenance popover (agency + URL + fetch path). */
  fieldSource?: FieldSource;
  fetchPath?: string;
  hubSyncedAt?: string;
  /** Extra upstream feeds (ⓘ each). */
  feedSourceIds?: FeedSourceId[];
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const age = asOf && now ? relative(asOf, now) : null;
  const provenanceSource: FieldSource | undefined =
    fieldSource ??
    (fetchPath
      ? { provider: source, url: methodology, asOf: asOf ?? undefined, fetchMethod: fetchPath }
      : undefined);

  return (
    <p className={cn("text-sm leading-6 text-muted-foreground inline-flex flex-wrap items-center gap-x-1 gap-y-0.5", className)}>
      <span>
        Source: {source}
        {age ? (
          <>
            {" "}
            · Updated <time dateTime={asOf ?? undefined}>{age}</time>
          </>
        ) : null}
        {delayed ? <> · {delayed}</> : null}
        {" · "}
        <Link href={methodology} className="underline-offset-2 hover:underline">
          Methodology
        </Link>
        {` · ${note}`}
      </span>
      {provenanceSource ? (
        <DataInfo
          name={source}
          source={provenanceSource}
          fetchPath={fetchPath ?? provenanceSource.fetchMethod}
          hubSyncedAt={hubSyncedAt ?? asOf ?? undefined}
          className="ml-0.5"
        />
      ) : null}
      {feedSourceIds?.map((id) => (
        <FeedSourceInfo key={id} sourceId={id} hubSyncedAt={hubSyncedAt ?? asOf ?? undefined} className="scale-90" />
      ))}
    </p>
  );
}
