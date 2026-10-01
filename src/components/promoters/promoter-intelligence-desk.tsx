"use client";

import { Panel } from "@/components/layout/page-header";
import {
  classifyPromoterActionBucket,
  classifyPromoterRecency,
  countPromoterActionBuckets,
  countPromoterRecency,
  groupPromoterByAction,
  PROMOTER_ACTION_SECTIONS,
  PROMOTER_RECENCY_TILES,
  type PromoterActionBucket,
  type PromoterRecencyBucket,
} from "@/lib/promoters/feed-buckets";
import type { PromoterFeedItem, PromoterFeedSnapshot } from "@/lib/promoters/feed-types";
import { promoterCategoryLabel } from "@/lib/promoters/parse-category";
import { cn } from "@/lib/utils";
import { ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function MetricTile({
  label,
  count,
  description,
  active,
  onClick,
  className,
  valueClassName,
}: {
  label: string;
  count: number;
  description?: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bento-stat-tile w-full cursor-pointer text-left transition-[transform,box-shadow,border-color] duration-200",
        "hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active && "border-primary ring-2 ring-primary/30 shadow-md",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", valueClassName)}>{count}</p>
      {description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p> : null}
    </button>
  );
}

function PromoterRow({ item }: { item: PromoterFeedItem }) {
  return (
    <article className="rounded-xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {item.channel}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {promoterCategoryLabel(item.category)}
          </span>
        </div>
        <time className="text-xs tabular-nums text-muted-foreground" dateTime={item.transactionDate}>
          {item.transactionDate}
        </time>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-snug">{item.title}</h3>
      {item.companyName ? <p className="mt-1 text-xs text-muted-foreground">{item.companyName}</p> : null}
      <div className="mt-3 flex flex-wrap gap-3 border-t border-border/50 pt-3">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Verify filing <ExternalLink className="size-3" />
        </a>
        {item.symbol ? (
          <Link href={`/research/${encodeURIComponent(item.symbol)}`} className="text-xs text-muted-foreground hover:text-foreground">
            {item.symbol} →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function applyFilters(
  items: PromoterFeedItem[],
  recency: PromoterRecencyBucket | null,
  action: PromoterActionBucket | null,
) {
  return items.filter((item) => {
    if (recency && classifyPromoterRecency(item) !== recency) return false;
    if (action && classifyPromoterActionBucket(item) !== action) return false;
    return true;
  });
}

export function PromoterIntelligenceDesk({
  snapshot,
  loading,
  onRefresh,
}: {
  snapshot?: PromoterFeedSnapshot;
  loading: boolean;
  onRefresh?: () => void;
}) {
  const [recencyFilter, setRecencyFilter] = useState<PromoterRecencyBucket | null>(null);
  const [actionFilter, setActionFilter] = useState<PromoterActionBucket | null>(null);

  const items = snapshot?.items ?? [];
  const recency = countPromoterRecency(items);
  const actions = countPromoterActionBuckets(items);
  const displayItems = useMemo(
    () => applyFilters(items, recencyFilter, actionFilter),
    [items, recencyFilter, actionFilter],
  );
  const groups = groupPromoterByAction(displayItems);
  const sections = PROMOTER_ACTION_SECTIONS.filter((s) => (groups.get(s.bucket)?.length ?? 0) > 0);
  const tileActive = recencyFilter !== null || actionFilter !== null;

  if (loading && !snapshot) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-primary" />
        Loading promoter & insider disclosures…
      </div>
    );
  }

  if (snapshot?.dataStatus !== "AVAILABLE" || items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        {snapshot?.message ?? "Promoter feed unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {items.length} items · {snapshot.collectorsUsed.join(", ")} ·{" "}
          {new Date(snapshot.asOf).toLocaleString("en-IN")}
        </span>
        {onRefresh ? (
          <button type="button" onClick={() => onRefresh()} className="font-semibold text-primary hover:underline">
            Refresh
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <MetricTile
            label="In this view"
            count={items.length}
            description={tileActive ? "Clear tile filters" : "After search filters"}
            active={!tileActive}
            onClick={() => {
              setRecencyFilter(null);
              setActionFilter(null);
            }}
          />
          {PROMOTER_RECENCY_TILES.map((t) => (
            <MetricTile
              key={t.bucket}
              label={t.title}
              count={recency[t.bucket]}
              description={t.description}
              active={recencyFilter === t.bucket}
              onClick={() => setRecencyFilter((p) => (p === t.bucket ? null : t.bucket))}
            />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {PROMOTER_ACTION_SECTIONS.map((s) => (
            <MetricTile
              key={s.bucket}
              label={s.title}
              count={actions[s.bucket]}
              description={s.description}
              active={actionFilter === s.bucket}
              onClick={() => setActionFilter((p) => (p === s.bucket ? null : s.bucket))}
              className={
                s.bucket === "buying"
                  ? "border-emerald-500/25"
                  : s.bucket === "selling"
                    ? "border-rose-500/25"
                    : undefined
              }
              valueClassName={
                s.bucket === "buying"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : s.bucket === "selling"
                    ? "text-rose-700 dark:text-rose-300"
                    : undefined
              }
            />
          ))}
        </div>
      </div>

      {displayItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No items for this tile filter.</p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const rows = groups.get(section.bucket) ?? [];
            return (
              <Panel
                key={section.bucket}
                id={`promoter-${section.bucket}`}
                title={`${section.title} (${rows.length})`}
                subtitle={section.description}
                defaultOpen={section.bucket === "selling" || section.bucket === "pledge"}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {rows.map((row) => (
                    <PromoterRow key={row.id} item={row} />
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
