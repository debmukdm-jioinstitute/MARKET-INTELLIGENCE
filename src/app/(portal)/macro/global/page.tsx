"use client";

import { PageHeader } from "@/components/layout/page-header";
import { GlobalMacroCard } from "@/components/dashboard/global-macro-card";
import { GlobalRadar } from "@/components/dashboard/global-radar";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";

export default function GlobalMacroPage() {
  const { data } = useIndiaDashboard(45_000);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Global Macro"
        title="Global Macroeconomic Data & Cross-Market Spreads"
        subtitle="Tracking US benchmarks, global sovereign yield curves, currency strength (DXY), and inter-market correlation coefficients."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlobalMacroCard data={data} />
        {data ? <GlobalRadar data={data} /> : null}
      </div>
    </div>
  );
}
