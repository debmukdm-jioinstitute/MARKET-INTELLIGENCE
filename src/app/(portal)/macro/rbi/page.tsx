"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RbiLiquidity } from "@/components/dashboard/rbi-liquidity";
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
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
            POLICY CORRIDOR RATES & TARGETS
          </h3>

          <div className="space-y-3 divide-y divide-border/50">
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">Policy Repo Rate:</span>
              <span className="font-bold text-foreground">5.50% (Neutral Stance)</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">Standing Deposit Facility (SDF):</span>
              <span className="font-bold text-foreground">5.25%</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">Marginal Standing Facility (MSF):</span>
              <span className="font-bold text-foreground">5.75%</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">Cash Reserve Ratio (CRR):</span>
              <span className="font-bold text-foreground">4.50%</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">Statutory Liquidity Ratio (SLR):</span>
              <span className="font-bold text-foreground">18.00%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
