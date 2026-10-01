"use client";

import { Panel } from "@/components/layout/page-header";
import { creditActionLabel } from "@/lib/credit/parse-action";
import {
  classifyCreditActionBucket,
  classifyCreditRecency,
  countCreditActionBuckets,
  countCreditRecency,
  CREDIT_ACTION_SECTIONS,
  groupCreditByAction,
  type CreditActionBucket,
  type CreditRecencyBucket,
} from "@/lib/credit/feed-buckets";
import type { CreditFeedItem, CreditFeedSnapshot } from "@/lib/credit/types";
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

function CreditActionRow({ item }: { item: CreditFeedItem }) {
  const label = creditActionLabel(item.action);
  return (
    <article className="rounded-xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {item.agency}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-bold uppercase",
              item.action === "RATING_UPGRADE" && "bg-emerald-500/15 text-emerald-700",
              item.action === "RATING_DOWNGRADE" && "bg-rose-500/15 text-rose-700",
              item.action === "OUTLOOK_CHANGE" && "bg-sky-500/15 text-sky-800",
              item.action === "CREDIT_WATCH" && "bg-amber-500/15 text-amber-800",
            )}
          >
            {label}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.collector}</span>
        </div>
        <time className="text-xs tabular-nums text-muted-foreground" dateTime={item.actionDate}>
          {item.actionDate}
        </time>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground">{item.title}</h3>
      {item.companyName ? (
        <p className="mt-1 text-xs text-muted-foreground">{item.companyName}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Verify release <ExternalLink className="size-3" />
        </a>
        {item.symbol ? (
          <Link href={`/research/${encodeURIComponent(item.symbol)}`} className="text-xs text-muted-foreground hover:text-foreground">
            {item.symbol} dossier →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

const RECENCY_TILES: { bucket: CreditRecencyBucket; title: string; description: string }[] = [
  { bucket: "today", title: "Today", description: "Last 24h (IST)." },
  { bucket: "week", title: "This week", description: "Past 7 days." },
  { bucket: "month", title: "This month", description: "Past 30 days." },
  { bucket: "archive", title: "Archive", description: "Older than 30 days." },
];

function applyTileFilters(
  items: CreditFeedItem[],
  recency: CreditRecencyBucket | null,
  action: CreditActionBucket | null,
) {
  return items.filter((item) => {
    if (recency && classifyCreditRecency(item) !== recency) return false;
    if (action && classifyCreditActionBucket(item) !== action) return false;
    return true;
  });
}

export function CreditIntelligenceDesk({
  snapshot,
  loading,
  onRefresh,
}: {
  snapshot?: CreditFeedSnapshot;
  loading: boolean;
  onRefresh?: () => void;
}) {
  const [recencyFilter, setRecencyFilter] = useState<CreditRecencyBucket | null>(null);
  const [actionFilter, setActionFilter] = useState<CreditActionBucket | null>(null);

  const items = snapshot?.items ?? [];
  const recency = countCreditRecency(items);
  const actions = countCreditActionBuckets(items);

  const displayItems = useMemo(
    () => applyTileFilters(items, recencyFilter, actionFilter),
    [items, recencyFilter, actionFilter],
  );
  const groups = groupCreditByAction(displayItems);
  const sections = CREDIT_ACTION_SECTIONS.filter((s) => (groups.get(s.bucket)?.length ?? 0) > 0);

  if (loading && !snapshot) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-primary" />
        Loading agency rating actions…
      </div>
    );
  }

  if (snapshot?.dataStatus !== "AVAILABLE" || items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        {snapshot?.message ?? "Credit feed unavailable."}
      </div>
    );
  }

  const tileActive = recencyFilter !== null || actionFilter !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {items.length} releases · collectors: {snapshot.collectorsUsed.join(", ")} · as of{" "}
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
            description={tileActive ? "Clear tile filters" : snapshot.message.slice(0, 80)}
            active={!tileActive}
            onClick={() => {
              setRecencyFilter(null);
              setActionFilter(null);
            }}
          />
          {RECENCY_TILES.map((t) => (
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIT_ACTION_SECTIONS.map((s) => (
            <MetricTile
              key={s.bucket}
              label={s.title}
              count={actions[s.bucket]}
              description={s.description}
              active={actionFilter === s.bucket}
              onClick={() => setActionFilter((p) => (p === s.bucket ? null : s.bucket))}
              className={
                s.bucket === "upgrade"
                  ? "border-emerald-500/25"
                  : s.bucket === "downgrade"
                    ? "border-rose-500/25"
                    : undefined
              }
              valueClassName={
                s.bucket === "upgrade"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : s.bucket === "downgrade"
                    ? "text-rose-700 dark:text-rose-300"
                    : undefined
              }
            />
          ))}
        </div>
      </div>

      {displayItems.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No items for this tile filter.</p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const sectionRows = groups.get(section.bucket) ?? [];
            return (
              <Panel
                key={section.bucket}
                id={`credit-${section.bucket}`}
                title={`${section.title} (${sectionRows.length})`}
                subtitle={section.description}
                defaultOpen={section.bucket === "downgrade" || section.bucket === "upgrade"}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {sectionRows.map((row) => (
                    <CreditActionRow key={row.id} item={row} />
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
