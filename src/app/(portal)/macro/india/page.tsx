"use client";

import { PageHeader } from "@/components/layout/page-header";
import { IndiaMacroCard } from "@/components/dashboard/india-macro-card";
import { IndiaMacro } from "@/components/dashboard/india-macro";
import { RbiLiquidity } from "@/components/dashboard/rbi-liquidity";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";

export default function IndiaMacroPage() {
  const { data } = useIndiaDashboard(45_000);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Sovereign Macro"
        title="India Macroeconomic Intelligence Desk"
        subtitle="Comprehensive official indicators: GDP growth, CPI/WPI inflation, PMI surveys, banking credit growth, and foreign exchange reserves."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IndiaMacroCard data={data} />
        {data ? <RbiLiquidity data={data} /> : null}
      </div>

      {data ? <IndiaMacro data={data} /> : null}
    </div>
  );
}
