"use client";

import { PageHeader } from "@/components/layout/page-header";
import { GlobalMacroCard } from "@/components/dashboard/global-macro-card";
import { GlobalRadar } from "@/components/dashboard/global-radar";
import { MacroHistoryGrid } from "@/components/macro/macro-history-grid";
import { MacroSectionFreshness } from "@/components/macro/macro-section-freshness";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { useMacroHub } from "@/hooks/use-macro-hub";
import { metricsWithHistory, sectionMetrics } from "@/lib/macro/metric-tree";
import Link from "next/link";
import { GLOBAL_23_COUNTRIES } from "@/lib/macro/countries";

export default function GlobalMacroPage() {
  const { data, loading, error } = useIndiaDashboard(45_000);
  const hub = useMacroHub(120_000);
  const globalSection = hub.data?.sections.global;

  return (
    <div className="portal-page pb-10">
      <PageHeader

        title="Global Macroeconomic Data & Cross-Market Spreads"
        subtitle="Tracking US benchmarks, global sovereign yield curves, currency strength (DXY), and inter-market correlation coefficients."
        trust={{ source: "Yahoo Finance, FRED", asOf: data?.fetchedAt, delayed: "Quotes may be delayed" }}
        />

      {loading && !data ? <p className="text-sm text-muted-foreground mb-4">Loading global macro…</p> : null}
      {error ? <p className="text-sm text-rose-600 mb-4">{error}</p> : null}

      <p className="mb-4 text-sm text-muted-foreground">
        Live equity benchmarks (Americas, Europe, Asia, India) with ranges and charts on{" "}
        <Link href="/markets?section=world" className="font-medium text-primary hover:underline">
          World indices
        </Link>
        .
      </p>

      <div className="bento-grid-cols-2">
        <GlobalMacroCard data={data} />
        {data ? <GlobalRadar data={data} /> : null}
      </div>


      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Major Global Economies (23 Countries)</h2>
        <p className="text-xs text-muted-foreground">Sovereign macroeconomic profiles: GDP growth, CPI inflation, policy rates, 10Y sovereign yields, and credit gap.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {GLOBAL_23_COUNTRIES.map((cty) => (
            <Link
              key={cty.iso}
              href={`/macro/global/${cty.iso}`}
              className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs font-medium hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <span className="text-xl leading-none" role="img" aria-label={cty.name}>{cty.flag}</span>
              <span className="truncate">{cty.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {hub.data && globalSection ? (
        <div className="mt-8 space-y-4">
          <MacroSectionFreshness section={globalSection} hubFetchedAt={hub.data.fetchedAt} />
          <MacroHistoryGrid
            metrics={metricsWithHistory(sectionMetrics(globalSection), 2)}
            title="Global macro — FRED & live tape history"
          />
        </div>
      ) : hub.loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading macro hub series…</p>
      ) : null}
    </div>
  );
}
