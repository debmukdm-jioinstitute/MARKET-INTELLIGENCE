"use client";

import { PageHeader } from "@/components/layout/page-header";
import { GlobalMacroCard } from "@/components/dashboard/global-macro-card";
import { GlobalRadar } from "@/components/dashboard/global-radar";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import Link from "next/link";

export default function GlobalMacroPage() {
  const { data } = useIndiaDashboard(45_000);

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Global Macro"
        title="Global Macroeconomic Data & Cross-Market Spreads"
        subtitle="Tracking US benchmarks, global sovereign yield curves, currency strength (DXY), and inter-market correlation coefficients."
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Live equity benchmarks (Americas, Europe, Asia, India) with ranges and charts on{" "}
        <Link href="/macro/indices" className="font-medium text-primary hover:underline">
          World indices
        </Link>
        .
      </p>

      <div className="bento-grid-cols-2">
        <GlobalMacroCard data={data} />
        {data ? <GlobalRadar data={data} /> : null}
      </div>
    </div>
  );
}
