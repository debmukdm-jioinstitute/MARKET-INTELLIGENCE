"use client";

import { GlobalRadar } from "@/components/dashboard/global-radar";
import { IndiaMacro } from "@/components/dashboard/india-macro";
import { IndiaMoving } from "@/components/dashboard/india-moving";
import { MarketPulse } from "@/components/dashboard/market-pulse";
import { MoneyFlow } from "@/components/dashboard/money-flow";
import { RbiLiquidity } from "@/components/dashboard/rbi-liquidity";
import { PageHeader } from "@/components/layout/page-header";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";

export default function DashboardPage() {
  const { data, loading, error, reload } = useIndiaDashboard(55_000);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="India desk"
        title="Dashboard"
        subtitle="Market pulse, what is moving India, global radar, macro, liquidity, and institutional flows — sourced from NSE, Yahoo Finance, World Bank, MOSPI, and RBI links. No synthetic marks."
      />
      <button
        type="button"
        onClick={() => reload()}
        className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
      >
        Refresh dashboard
      </button>
      {loading && !data ? <p className="text-sm text-muted-foreground">Loading live India dashboard…</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {data ? (
        <>
          <MarketPulse data={data} />
          <IndiaMoving data={data} />
          <GlobalRadar data={data} />
          <IndiaMacro data={data} />
          <div className="grid gap-4 xl:grid-cols-2">
            <RbiLiquidity data={data} />
            <MoneyFlow data={data} />
          </div>
        </>
      ) : null}
    </div>
  );
}
