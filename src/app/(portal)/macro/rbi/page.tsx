"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RbiLiquidity } from "@/components/dashboard/rbi-liquidity";
import { RbiStanceGauge } from "@/components/dashboard/rbi-stance-gauge";
import { NewsStream } from "@/components/feeds/news-stream";
import { MetricInfo } from "@/components/ui/metric-info";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { Landmark } from "lucide-react";

function showRate(v: string | null | undefined) {
  return v ?? "—";
}

export default function RbiPolicyPage() {
  const { data, loading, error } = useIndiaDashboard(45_000);
  const { data: feedData } = useFeedHub(45_000);
  const rbiNews = feedData?.news?.filter((n) => n.source === "rbi") ?? [];
  const corridor = data?.rbiLiquidity?.corridor;

  return (
    <div className="portal-page pb-10">
      <PageHeader

        title="RBI Policy Stance & Banking Liquidity Desk"
        subtitle="Monetary policy corridor, system liquidity, and RBI press releases — no placeholder policy rates."
        trust={{ source: "Reserve Bank of India", asOf: data?.fetchedAt }}
        />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading RBI dashboard…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <RbiStanceGauge />

      <div className="bento-grid-cols-2">
        {data ? <RbiLiquidity data={data} /> : null}

        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-sm shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
              POLICY CORRIDOR RATES & TARGETS
            </h3>
            <MetricInfo id="repo" asOf={data?.fetchedAt} iconSize="xs" />
          </div>

          {!corridor ? (
            <p className="text-muted-foreground">Policy rates unavailable until RBI collector syncs.</p>
          ) : (
            <div className="space-y-3 divide-y divide-border/50">
              {(
                [
                  ["Policy Repo Rate", "repo", corridor.repo, corridor.stance],
                  ["Standing Deposit Facility (SDF)", "sdf", corridor.sdf, null],
                  ["Marginal Standing Facility (MSF)", "msf", corridor.msf, null],
                  ["Cash Reserve Ratio (CRR)", "crr", corridor.crr, null],
                  ["Statutory Liquidity Ratio (SLR)", "slr", corridor.slr, null],
                  ["Fixed Reverse Repo Rate", "reverse_repo", corridor.reverseRepo, null],
                ] as const
              ).map(([label, metricId, val, sub]) => (
                <div key={label} className="pt-2 first:pt-0 flex justify-between items-center gap-4">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {label}:
                    <MetricInfo id={metricId} asOf={data?.fetchedAt} value={showRate(val)} iconSize="xs" />
                  </span>
                  <span className="font-bold text-foreground text-right">
                    {showRate(val)}
                    {sub ? ` (${sub})` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {rbiNews.length ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
                RBI REGULATORY ACTIONS & MONEY MARKET OPERATIONS
              </h3>
            </div>
          </div>
          <NewsStream items={rbiNews} limit={16} />
        </div>
      ) : null}
    </div>
  );
}
