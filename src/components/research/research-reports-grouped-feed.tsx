"use client";

import { Panel } from "@/components/layout/page-header";
import { ResearchReportCard } from "@/components/research/research-report-card";
import { ResearchReportsTable, type ResearchReportRow } from "@/components/research/research-reports-table";
import {
  classifyReportRecency,
  classifyReportReco,
  countReportsByRecency,
  countReportsByReco,
  groupReportsByRecency,
  REPORT_RECENCY_SECTIONS,
  type ReportRecencyBucket,
  type ReportRecoBucket,
} from "@/lib/research/report-recency";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
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

function RecencyMetrics({
  total,
  recency,
  reco,
  recencyFilter,
  recoFilter,
  onClear,
  onRecency,
  onReco,
}: {
  total: number;
  recency: ReturnType<typeof countReportsByRecency>;
  reco: ReturnType<typeof countReportsByReco>;
  recencyFilter: ReportRecencyBucket | null;
  recoFilter: ReportRecoBucket | null;
  onClear: () => void;
  onRecency: (bucket: ReportRecencyBucket) => void;
  onReco: (bucket: ReportRecoBucket) => void;
}) {
  const tileFilterActive = recencyFilter !== null || recoFilter !== null;
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile
          label="In this view"
          count={total}
          description={tileFilterActive ? "Click to clear tile filters" : "After filters & search"}
          active={!tileFilterActive}
          onClick={onClear}
        />
        {REPORT_RECENCY_SECTIONS.map((s) => (
          <MetricTile
            key={s.bucket}
            label={s.title}
            count={recency[s.bucket]}
            description={s.description}
            active={recencyFilter === s.bucket}
            onClick={() => onRecency(s.bucket)}
          />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Buy / Add"
          count={reco.buy}
          active={recoFilter === "buy"}
          onClick={() => onReco("buy")}
          className="border-emerald-500/25"
          valueClassName="text-emerald-700 dark:text-emerald-300"
        />
        <MetricTile
          label="Hold / Neutral"
          count={reco.hold}
          active={recoFilter === "hold"}
          onClick={() => onReco("hold")}
          className="border-amber-500/25"
          valueClassName="text-amber-800 dark:text-amber-200"
        />
        <MetricTile
          label="Sell / Reduce"
          count={reco.sell}
          active={recoFilter === "sell"}
          onClick={() => onReco("sell")}
          className="border-rose-500/25"
          valueClassName="text-rose-700 dark:text-rose-300"
        />
        <MetricTile
          label="No rating"
          count={reco.unrated}
          active={recoFilter === "unrated"}
          onClick={() => onReco("unrated")}
        />
      </div>
    </div>
  );
}

function applyTileFilters(
  rows: ResearchReportRow[],
  recencyFilter: ReportRecencyBucket | null,
  recoFilter: ReportRecoBucket | null,
): ResearchReportRow[] {
  return rows.filter((r) => {
    if (recencyFilter && classifyReportRecency(r) !== recencyFilter) return false;
    if (recoFilter && classifyReportReco(r) !== recoFilter) return false;
    return true;
  });
}

export function ResearchReportsGroupedFeed({
  rows,
  loading,
  viewMode,
}: {
  rows: ResearchReportRow[];
  loading: boolean;
  viewMode: "cards" | "table";
}) {
  const [recencyFilter, setRecencyFilter] = useState<ReportRecencyBucket | null>(null);
  const [recoFilter, setRecoFilter] = useState<ReportRecoBucket | null>(null);

  const recency = countReportsByRecency(rows);
  const reco = countReportsByReco(rows);

  const displayRows = useMemo(
    () => applyTileFilters(rows, recencyFilter, recoFilter),
    [rows, recencyFilter, recoFilter],
  );

  const groups = groupReportsByRecency(displayRows);
  const sections = REPORT_RECENCY_SECTIONS.filter((s) => (groups.get(s.bucket)?.length ?? 0) > 0);

  const toggleRecency = (bucket: ReportRecencyBucket) => {
    setRecencyFilter((prev) => (prev === bucket ? null : bucket));
  };

  const toggleReco = (bucket: ReportRecoBucket) => {
    setRecoFilter((prev) => (prev === bucket ? null : bucket));
  };

  if (loading && rows.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
        <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-primary" />
        Ingesting latest institutional research & broker PDFs…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No research reports match your current filter criteria. Try clearing search or selecting All Reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RecencyMetrics
        total={rows.length}
        recency={recency}
        reco={reco}
        recencyFilter={recencyFilter}
        recoFilter={recoFilter}
        onClear={() => {
          setRecencyFilter(null);
          setRecoFilter(null);
        }}
        onRecency={toggleRecency}
        onReco={toggleReco}
      />

      {displayRows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No reports in this tile combination. Click &ldquo;In this view&rdquo; to reset tile filters.
        </p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const sectionRows = groups.get(section.bucket) ?? [];
            const panelOpen =
              recencyFilter === null
                ? section.bucket === "today" || section.bucket === "week"
                : recencyFilter === section.bucket;
            return (
              <Panel
                key={section.bucket}
                id={`research-recency-${section.bucket}`}
                title={`${section.title} (${sectionRows.length})`}
                subtitle={section.description}
                defaultOpen={panelOpen}
              >
                {viewMode === "table" ? (
                  <ResearchReportsTable rows={sectionRows} />
                ) : (
                  <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                    {sectionRows.map((r) => (
                      <ResearchReportCard key={r.id || r.url} r={r} />
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
