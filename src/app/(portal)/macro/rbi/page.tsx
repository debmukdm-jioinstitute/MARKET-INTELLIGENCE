"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RbiLiquidity } from "@/components/dashboard/rbi-liquidity";
import { MetricInfo } from "@/components/ui/metric-info";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";

export default function RbiPolicyPage() {
  const { data } = useIndiaDashboard(45_000);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Central Banking"
        title="RBI Policy Stance & Banking Liquidity Desk"
        subtitle="Monetary policy corridor, policy repo rate, standing deposit facility (SDF), VRR/VRRR auction operations, and system liquidity balances."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data ? <RbiLiquidity data={data} /> : null}

        <div className="rounded-xl border border-border bg-card p-6 space-y-4 font-mono text-xs shadow-sm">
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
              <span className="font-bold text-emerald-400">{data?.rbiLiquidity?.corridor?.crr ?? "3.00%"}</span>
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
    </div>
  );
}
