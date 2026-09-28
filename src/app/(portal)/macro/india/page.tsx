"use client";

import { EconomicCalendarSection } from "@/components/dashboard/economic-calendar-section";
import { IndiaMacroCard } from "@/components/dashboard/india-macro-card";
import { IndiaMacro } from "@/components/dashboard/india-macro";
import { RbiLiquidity } from "@/components/dashboard/rbi-liquidity";
import { PageHeader } from "@/components/layout/page-header";
import { ScrollToUrlSection } from "@/components/routing/scroll-to-url-section";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { Suspense } from "react";

export default function IndiaMacroPage() {
  const { data, loading, error } = useIndiaDashboard(45_000);

  return (
    <div className="portal-page pb-10">
      <Suspense fallback={null}>
        <ScrollToUrlSection />
      </Suspense>
      <PageHeader
        kicker="Sovereign Macro"
        title="India Macroeconomic Intelligence Desk"
        subtitle="Comprehensive official indicators: GDP growth, CPI/WPI inflation, PMI surveys, banking credit growth, and foreign exchange reserves."
        trust={{ source: "RBI, NSE India, MOSPI", asOf: data?.fetchedAt }}
        />

      {loading && !data ? <p className="text-sm text-muted-foreground mb-4">Loading India macro…</p> : null}
      {error ? <p className="text-sm text-rose-600 mb-4">{error}</p> : null}

      <div className="bento-grid-cols-2">
        <IndiaMacroCard data={data} />
        {data ? <RbiLiquidity data={data} /> : null}
      </div>

      {data ? <IndiaMacro data={data} /> : null}

      <div className="mt-10">
        <EconomicCalendarSection />
      </div>
    </div>
  );
}
