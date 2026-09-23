"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { MacroTapeSkeleton } from "@/components/macro/macro-tape-skeleton";
import { RegimeBanner } from "@/components/macro/regime-banner";
import { SectionNavGrid } from "@/components/macro/section-nav-grid";
import { CommoditiesStrip } from "@/components/macro/commodities-strip";
import { CurrencyStrip } from "@/components/macro/currency-strip";
import { TransmissionPanels } from "@/components/macro/transmission-panels";
import { WhatChangedCard } from "@/components/macro/what-changed-card";
import { YieldCurveCard } from "@/components/macro/yield-curve-card";
import { Lines } from "@/components/charts/terminal-charts";
import { useMacroHub } from "@/hooks/use-macro-hub";
import { useMacroTape } from "@/hooks/use-macro-tape";

export default function MacroPage() {
  const { data, loading, error } = useMacroHub();
  const tape = useMacroTape();

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Macroeconomic intelligence"
        title="India macro hub"
        subtitle="Regime-first view with nested growth, inflation, RBI liquidity, fiscal, consumer, corporate, external, jobs, and global tape — open data (MOSPI, RBI, World Bank, FRED, NSE)."
      />

      {loading && !data ? <MacroTapeSkeleton count={3} /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {tape.data ? <WhatChangedCard seed={tape.data.briefingSeed} /> : null}

      {tape.data ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <YieldCurveCard india={tape.data.indiaYieldCurve} us={tape.data.usYieldCurve} />
          <CommoditiesStrip rows={tape.data.commodities} />
          <CurrencyStrip rows={tape.data.currencies} />
        </div>
      ) : null}

      {tape.data ? (
        <TransmissionPanels brent={tape.data.transmission.brent} usdInr={tape.data.transmission.usdInr} />
      ) : null}

      {data ? (
        <>
          <RegimeBanner regime={data.regime} />
          <Panel title="Growth vs inflation (regime drivers)">
            <div className="h-[240px]">
              <Lines
                data={data.regime.growthInflationChart}
                keys={[
                  { key: "growth", color: "#3dd68c", name: "Growth % y/y" },
                  { key: "inflation", color: "#f97316", name: "Inflation % y/y" },
                ]}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Updated {new Date(data.fetchedAt).toLocaleString()} · Quadrant labels in{" "}
              <a href="/macro/regime" className="text-primary hover:underline">Macro regime</a>
            </p>
          </Panel>
          <div>
            <h2 className="mb-3 text-sm uppercase tracking-[0.22em] text-primary">Explore sections</h2>
            <SectionNavGrid />
          </div>
        </>
      ) : null}
    </div>
  );
}
