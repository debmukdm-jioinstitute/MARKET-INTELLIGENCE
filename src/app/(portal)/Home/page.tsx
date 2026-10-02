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
import { AiNewsIntelPanel } from "@/components/hf-ai/ai-news-intel-panel";

export default function DashboardPage() {
  const { data, loadingFull, error, reload } = useIndiaDashboard(45_000);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
              <Terminal className="size-3.5" />
              INSTITUTIONAL COCKPIT
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Your markets and portfolio, at a glance.
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Five AI analysts, every section of the site, and live Indian market and portfolio data — all on one screen.
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
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <span>
            ⚡ Some live feeds are slow to respond — showing last cached data.
            <span className="ml-1.5 text-muted-foreground">{error.includes("504") || error.includes("503") || error.includes("DEADLINE") ? "Upstream timeout — retrying automatically." : error}</span>
          </span>
          <button
            type="button"
            onClick={() => reload()}
            className="ml-3 shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-500/20 dark:text-amber-200 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Row 1: Hero India Market + My Portfolio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <HeroIndiaMarket data={data} />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <MyPortfolioCard />
        </div>
      </div>

      {/* Row 2: India Macro + Portfolio Risk */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <IndiaMacroCard data={data} />
        <PortfolioRiskCard />
      </div>

      {/* Row 3: Global Macro + Commodities & FX */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <GlobalMacroCard data={data} />
        <CommoditiesFxCard data={data} />
      </div>

      {/* Row 4: Full-width WHAT CHANGED? Module */}
      <WhatChangedModule />

      {/* Row 4b: AI Market Intelligence — FinBERT Sentiment + BART TL;DR */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">🧠</span>
          <div>
            <p className="text-sm font-bold text-foreground">AI Market Intelligence</p>
            <p className="text-xs text-muted-foreground">Live sentiment and summary from today&apos;s news — ProsusAI/FinBERT + facebook/BART</p>
          </div>
        </div>
        <AiNewsIntelPanel compact />
      </div>

      {/* Row 5: Corporate Events (RSS) + Earnings Calendar */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <CorporateEventsCard />
        <EarningsCalendarCard />
      </div>

      {/* Row 6: Market Valuation + Market Momentum */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <MarketValuationCard />
        <MarketMomentumCard />
      </div>

      {/* Row 7: Liquidity Telemetry & Institutional Money Flow */}
      {data ? (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <RbiLiquidity data={data} />
          <MoneyFlow data={data} />
        </div>
      ) : null}
    </div>
  );
}
