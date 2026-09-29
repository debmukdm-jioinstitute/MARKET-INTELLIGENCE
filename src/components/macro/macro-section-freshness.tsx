"use client";

import type { MacroSectionPayload } from "@/lib/macro/types";
import { sectionMetrics } from "@/lib/macro/metric-tree";
import { maxAgeDaysForMetric } from "@/lib/macro/sanity";
import { formatAsOfIst, freshness } from "@/lib/provenance";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DataInfo } from "@/components/feeds/data-info";

function latestObs(metric: { history: { date: string }[]; source: { asOf?: string } }): string | null {
  if (metric.history.length) return metric.history[metric.history.length - 1]?.date ?? null;
  return metric.source.asOf ?? null;
}

export function MacroSectionFreshness({
  section,
  hubFetchedAt,
}: {
  section: MacroSectionPayload;
  hubFetchedAt: string;
}) {
  const metrics = sectionMetrics(section);
  const withHist = metrics.filter((m) => m.history.length > 1).length;
  const hubFresh = freshness(hubFetchedAt);
  const staleCount = metrics.filter((m) => {
    const obs = latestObs(m);
    if (!obs) return false;
    const t = Date.parse(obs.length === 4 ? `${obs}-07-01` : obs.length === 7 ? `${obs}-15` : obs);
    if (Number.isNaN(t)) return false;
    const ageDays = (Date.now() - t) / 86_400_000;
    return ageDays > maxAgeDaysForMetric(m);
  }).length;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        staleCount > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-muted/30",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground">
          Hub refresh{" "}
          <span className={cn("font-medium", hubFresh.tone === "stale" ? "text-amber-700" : "text-foreground")}>
            {formatAsOfIst(hubFetchedAt) ?? hubFetchedAt} · {hubFresh.label}
          </span>
          {" · "}
          {metrics.length} metrics · {withHist} with history charts
          {staleCount > 0 ? (
            <span className="text-amber-800 dark:text-amber-200"> · {staleCount} series may need update</span>
          ) : null}
        </p>
        <Link href="/data/health" className="text-xs font-medium text-primary hover:underline">
          Collector health →
        </Link>
        <DataInfo
          name="Macro section data"
          source={{ provider: "Macro hub + collectors", url: "/api/macro/hub", asOf: hubFetchedAt }}
          hubSyncedAt={hubFetchedAt}
          fetchPath="buildIndiaMacroHub() / section payload — src/lib/macro/"
          className="scale-90"
        />
      </div>
    </div>
  );
}
