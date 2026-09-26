"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RbiLiquidity } from "@/components/dashboard/rbi-liquidity";
import { NewsStream } from "@/components/feeds/news-stream";
import { MetricInfo } from "@/components/ui/metric-info";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { Landmark } from "lucide-react";

export default function RbiPolicyPage() {
  const { data } = useIndiaDashboard(45_000);
  const { data: feedData } = useFeedHub(45_000);
  const rbiNews = feedData?.news?.filter((n) => n.source === "rbi") ?? [];

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Central Banking"
        title="RBI Policy Stance & Banking Liquidity Desk"
        subtitle="Monetary policy corridor, policy repo rate, standing deposit facility (SDF), VRR/VRRR auction operations, and system liquidity balances."
      />

      <div className="bento-grid-cols-2">
        {data ? <RbiLiquidity data={data} /> : null}

        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-sm shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
              POLICY CORRIDOR RATES & TARGETS
            </h3>
            <MetricInfo id="repo" asOf={data?.fetchedAt} iconSize="xs" />
          </div>

          <div className="space-y-3 divide-y divide-border/50">
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Policy Repo Rate:
                <MetricInfo id="repo" asOf={data?.fetchedAt} value={data?.rbiLiquidity?.corridor?.repo ?? "5.25%"} iconSize="xs" />
              </span>
              <span className="font-bold text-foreground">
                {data?.rbiLiquidity?.corridor?.repo ?? "5.25%"} ({data?.rbiLiquidity?.corridor?.stance ?? "Neutral Stance"})
              </span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Standing Deposit Facility (SDF):
                <MetricInfo id="sdf" asOf={data?.fetchedAt} value={data?.rbiLiquidity?.corridor?.sdf ?? "5.00%"} iconSize="xs" />
              </span>
              <span className="font-bold text-foreground">{data?.rbiLiquidity?.corridor?.sdf ?? "5.00%"}</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Marginal Standing Facility (MSF):
                <MetricInfo id="msf" asOf={data?.fetchedAt} value={data?.rbiLiquidity?.corridor?.msf ?? "5.50%"} iconSize="xs" />
              </span>
              <span className="font-bold text-foreground">{data?.rbiLiquidity?.corridor?.msf ?? "5.50%"}</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Cash Reserve Ratio (CRR):
                <MetricInfo id="crr" asOf={data?.fetchedAt} value={data?.rbiLiquidity?.corridor?.crr ?? "3.00%"} iconSize="xs" />
              </span>
              <span className="font-bold text-emerald-600">{data?.rbiLiquidity?.corridor?.crr ?? "3.00%"}</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Statutory Liquidity Ratio (SLR):
                <MetricInfo id="slr" asOf={data?.fetchedAt} value={data?.rbiLiquidity?.corridor?.slr ?? "18.00%"} iconSize="xs" />
              </span>
              <span className="font-bold text-foreground">{data?.rbiLiquidity?.corridor?.slr ?? "18.00%"}</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Fixed Reverse Repo Rate:
                <MetricInfo id="reverse_repo" asOf={data?.fetchedAt} value={data?.rbiLiquidity?.corridor?.reverseRepo ?? "3.35%"} iconSize="xs" />
              </span>
              <span className="font-bold text-foreground">{data?.rbiLiquidity?.corridor?.reverseRepo ?? "3.35%"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live RBI Operations & Auction Headlines */}
      {rbiNews.length ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
                RBI REGULATORY ACTIONS & MONEY MARKET OPERATIONS
              </h3>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                OFFICIAL PRESS RELEASES
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Overnight VRRR Auctions · OMO Sales · T-Bill Results · LAF Operations
            </span>
          </div>
          <NewsStream items={rbiNews} limit={16} />
        </div>
      ) : null}
    </div>
  );
}
