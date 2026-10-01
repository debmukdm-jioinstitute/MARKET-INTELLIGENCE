"use client";

import { Panel } from "@/components/layout/page-header";
import { ResearchReportCard } from "@/components/research/research-report-card";
import { ResearchReportsTable, type ResearchReportRow } from "@/components/research/research-reports-table";
import {
  countReportsByRecency,
  countReportsByReco,
  groupReportsByRecency,
  REPORT_RECENCY_SECTIONS,
} from "@/lib/research/report-recency";
import { RefreshCw } from "lucide-react";

function RecencyMetrics({ total, recency, reco }: { total: number; recency: ReturnType<typeof countReportsByRecency>; reco: ReturnType<typeof countReportsByReco> }) {
  const recencyTiles = REPORT_RECENCY_SECTIONS.filter((s) => recency[s.bucket] > 0);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bento-stat-tile">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">In this view</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{total}</p>
          <p className="mt-1 text-xs text-muted-foreground">After filters & search</p>
        </div>
        {recencyTiles.map((s) => (
          <div key={s.bucket} className="bento-stat-tile">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.title}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{recency[s.bucket]}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bento-stat-tile border-emerald-500/25">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buy / Add</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{reco.buy}</p>
        </div>
        <div className="bento-stat-tile border-amber-500/25">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hold / Neutral</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800 dark:text-amber-200">{reco.hold}</p>
        </div>
        <div className="bento-stat-tile border-rose-500/25">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sell / Reduce</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-700 dark:text-rose-300">{reco.sell}</p>
        </div>
        <div className="bento-stat-tile">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">No rating</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{reco.unrated}</p>
        </div>
      </div>
    </div>
  );
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
  const recency = countReportsByRecency(rows);
  const reco = countReportsByReco(rows);
  const groups = groupReportsByRecency(rows);
  const sections = REPORT_RECENCY_SECTIONS.filter((s) => (groups.get(s.bucket)?.length ?? 0) > 0);

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
      <RecencyMetrics total={rows.length} recency={recency} reco={reco} />

      <div className="space-y-4">
        {sections.map((section) => {
          const sectionRows = groups.get(section.bucket) ?? [];
          return (
            <Panel
              key={section.bucket}
              id={`research-recency-${section.bucket}`}
              title={`${section.title} (${sectionRows.length})`}
              subtitle={section.description}
              defaultOpen={section.bucket === "today" || section.bucket === "week"}
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
    </div>
  );
}
