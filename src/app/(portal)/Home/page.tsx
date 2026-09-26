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
import { PageHeader } from "@/components/layout/page-header";
import { RefreshCw } from "lucide-react";
import { ShippedPopup } from "@/components/marketing/shipped-popup";

export default function DashboardPage() {
  const { data, loadingFull, error, reload } = useIndiaDashboard(45_000);

  return (
    <div className="portal-page pb-10">
      <ShippedPopup />
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <PageHeader
          className="mb-0 min-w-0 flex-1"
          titleAs="h1"
          kicker="INSTITUTIONAL COCKPIT"
          title="Executive Market & Portfolio Intelligence"
          subtitle="Real-time multi-asset feeds, risk decomposition, macroeconomic telemetry, and live order books."
        />

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
