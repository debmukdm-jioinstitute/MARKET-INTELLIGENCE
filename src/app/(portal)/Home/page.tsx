"use client";

import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { FetchingBanner } from "@/components/dashboard/fetching-banner";
import { HeroIndiaMarket } from "@/components/dashboard/hero-india-market";
import { MyPortfolioCard } from "@/components/dashboard/my-portfolio-card";
import { IndiaMacroCard } from "@/components/dashboard/india-macro-card";
import { PortfolioRiskCard } from "@/components/dashboard/portfolio-risk-card";
import { GlobalMacroCard } from "@/components/dashboard/global-macro-card";
import { CommoditiesFxCard } from "@/components/dashboard/commodities-fx-card";
import { CorporateEventsCard } from "@/components/dashboard/corporate-events-card";
import { EarningsCalendarCard } from "@/components/dashboard/earnings-calendar-card";
import { MarketValuationCard } from "@/components/dashboard/market-valuation-card";
import { MarketMomentumCard } from "@/components/dashboard/market-momentum-card";
import { WhatChangedModule } from "@/components/dashboard/what-changed-module";
import { RbiLiquidity } from "@/components/dashboard/rbi-liquidity";
import { MoneyFlow } from "@/components/dashboard/money-flow";
import { RefreshCw, Terminal } from "lucide-react";

export default function DashboardPage() {
  const { data, loadingFull, error, reload } = useIndiaDashboard(45_000);

  return (
    <div className="portal-page pb-10">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
              <Terminal className="size-3.5" />
              INSTITUTIONAL COCKPIT
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Executive Market & Portfolio Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time multi-asset feeds, risk decomposition, macroeconomic telemetry, and live order books.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => reload()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors shadow-sm"
          >
            <RefreshCw className="size-3 text-muted-foreground" />
            Refresh Feeds
          </button>
        </div>
      </div>

      <FetchingBanner active={loadingFull} />
      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600">
          Feed Error: {error}
        </div>
      ) : null}

      <div className="bento-grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <HeroIndiaMarket data={data} />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <MyPortfolioCard />
        </div>
      </div>

      <div className="bento-grid-cols-2">
        <IndiaMacroCard data={data} />
        <PortfolioRiskCard />
      </div>

      <div className="bento-grid-cols-2">
        <GlobalMacroCard data={data} />
        <CommoditiesFxCard data={data} />
      </div>

      <WhatChangedModule />

      <div className="bento-grid-cols-2">
        <CorporateEventsCard />
        <EarningsCalendarCard />
      </div>

      <div className="bento-grid-cols-2">
        <MarketValuationCard />
        <MarketMomentumCard />
      </div>

      {data ? (
        <div className="bento-grid-cols-2">
          <RbiLiquidity data={data} />
          <MoneyFlow data={data} />
        </div>
      ) : null}
    </div>
  );
}
