"use client";

import { DataInfo } from "@/components/feeds/data-info";
import { fieldSourceFromFeedId, getFeedSourceProvenance, provenanceNote } from "@/lib/feeds/feed-source-provenance";
import type { FeedSourceId } from "@/lib/feeds/types";

export function FeedSourceInfo({
  sourceId,
  asOf,
  hubSyncedAt,
  itemUrl,
  name,
  healthMessage,
  className,
}: {
  sourceId: FeedSourceId;
  asOf?: string;
  hubSyncedAt?: string;
  /** Specific headline / filing URL (shown in popover). */
  itemUrl?: string;
  name?: string;
  healthMessage?: string;
  className?: string;
}) {
  const base = fieldSourceFromFeedId(sourceId, asOf);
  const prov = getFeedSourceProvenance(sourceId);
  const note = provenanceNote(sourceId, healthMessage);

  return (
    <DataInfo
      className={className}
      name={name ?? prov.provider}
      source={{ ...base, asOf: asOf ?? base.asOf }}
      hubSyncedAt={hubSyncedAt}
      fetchPath={prov.fetchMethod ?? base.fetchMethod}
      itemUrl={itemUrl}
      note={note}
    />
  );
}
