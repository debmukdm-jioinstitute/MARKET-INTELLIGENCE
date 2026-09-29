"use client";

import { useState } from "react";
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
import {
  RefreshCw,
  Compass,
  Flame,
  PieChart,
  ShieldAlert,
  Building2,
  BarChart3,
  MessageSquare,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { HomeAiFiveAgents } from "@/components/dashboard/home-ai-five-agents";
import { HomeExploreHub } from "@/components/dashboard/home-explore-hub";
import { TrustNote } from "@/components/ui/trust-note";
import { ShippedPopup } from "@/components/marketing/shipped-popup";
import { HomeTickerTape } from "@/components/dashboard/home-ticker-tape";
import { HomeExecutiveBriefSneakPeek } from "@/components/dashboard/home-executive-brief-sneak-peek";
import { PrimaryMarketSneakPeek } from "@/components/dashboard/primary-market-sneak-peek";
import { SmartMoneySneakPeek } from "@/components/dashboard/smart-money-sneak-peek";
import { CreditDegradationSneakPeek } from "@/components/dashboard/credit-degradation-sneak-peek";
import { CompanyConcallSneakPeek } from "@/components/dashboard/company-concall-sneak-peek";
import { BrokerConsensusSneakPeek } from "@/components/dashboard/broker-consensus-sneak-peek";
import { SocialsSentimentSneakPeek } from "@/components/dashboard/socials-sentiment-sneak-peek";
import { cn } from "@/lib/utils";

type CockpitFilter =
  | "all"
  | "markets"
  | "deals"
  | "smart-money"
  | "credit"
  | "company"
  | "broker-socials"
  | "scanners-ai";

const FILTER_TABS: { id: CockpitFilter; label: string; icon: typeof Compass; count?: string }[] = [
  { id: "all", label: "360° Cockpit", icon: Layers },
  { id: "deals", label: "IPOs, NCDs & Buybacks", icon: Flame, count: "Deals" },
  { id: "smart-money", label: "MFs & Promoters", icon: PieChart, count: "Smart Money" },
  { id: "credit", label: "Credit Degradation", icon: ShieldAlert, count: "Risk" },
  { id: "company", label: "Company & Concalls", icon: Building2, count: "Micro" },
  { id: "broker-socials", label: "Brokers & Reddit", icon: BarChart3, count: "Intel" },
  { id: "markets", label: "Markets & Macro", icon: Compass, count: "Macro" },
  { id: "scanners-ai", label: "AI & Scanners", icon: Cpu, count: "AI" },
];

export default function DashboardPage() {
  const { data, loadingFull, error, reload } = useIndiaDashboard(45_000);
  const [activeFilter, setActiveFilter] = useState<CockpitFilter>("all");

  return (
    <div className="portal-page pb-12 space-y-6">
      <ShippedPopup />

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <PageHeader
          className="mb-0 min-w-0 flex-1"
          titleAs="h1"
          kicker="INSTITUTIONAL MARKET INTELLIGENCE"
          title="The Complete Market Cockpit"
          subtitle="Real-time sneak-peeks across Macro, Micro, Company Disclosures, Mutual Funds, Promoters, Credit Degradation, Primary Deals (IPO/NCD/Buybacks), and Social Sentiment."
        />

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-foreground">LIVE FEEDS</span>
            <span>· NSE, BSE, RBI & AMFI</span>
          </div>

          <button
            type="button"
            onClick={() => reload()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors shadow-2xs active:scale-95"
          >
            <RefreshCw className="size-3 text-muted-foreground" />
            Refresh Feeds
          </button>
        </div>
      </div>

      {/* Live Cross-Asset Tape */}
      <HomeTickerTape data={data} />

      {/* Executive Daily Briefing Sneak Peek */}
      <HomeExecutiveBriefSneakPeek />

      {/* Trust & Source Note */}
      <TrustNote
        className="mt-1"
        source={[data?.pulse.nifty.source.provider, data?.pulse.usdInr.source.provider].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "NSE India, Upstox, Chittorgarh, CRISIL, AMFI"}
        asOf={data?.fetchedAt}
        delayed="Quotes may be delayed by exchange regulations"
        fieldSource={{
          provider: "Institutional Intelligence Composite",
          url: "/api/feeds/india-dashboard",
          asOf: data?.fetchedAt,
          fetchMethod:
            "buildIndiaDashboard() & SiteWideExecutiveBrief — Upstox, NSE breadth, Chittorgarh offers, CRISIL ratings, AMFI fund holdings",
        }}
        hubSyncedAt={data?.fetchedAt}
      />

      <FetchingBanner active={loadingFull} />
      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600">
          Feed Error: {error}
        </div>
      ) : null}

      {/* Interactive Cockpit Filter Pill Bar */}
      <div className="sticky top-14 z-20 -mx-2 px-2 py-2 backdrop-blur-md bg-background/80 border-b border-border/40">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs scale-[1.02]"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("size-3.5", isActive ? "text-primary-foreground" : "text-primary")} />
                <span>{tab.label}</span>
                {tab.count && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: Primary Market & Special Situations (IPO, NCD, Buybacks, NFOs) */}
      {(activeFilter === "all" || activeFilter === "deals") && (
        <div className="space-y-4">
          <PrimaryMarketSneakPeek />
        </div>
      )}

      {/* SECTION 2: Smart Money & Insider Radar (Mutual Funds + Promoters) */}
      {(activeFilter === "all" || activeFilter === "smart-money") && (
        <div className="space-y-4">
          <SmartMoneySneakPeek />
        </div>
      )}

      {/* SECTION 3: Credit Degradation & Solvency Radar */}
      {(activeFilter === "all" || activeFilter === "credit") && (
        <div className="space-y-4">
          <CreditDegradationSneakPeek />
        </div>
      )}

      {/* SECTION 4: Micro & Company Intelligence (Concalls, Timelines, Valuation Sandbox) */}
      {(activeFilter === "all" || activeFilter === "company") && (
        <div className="space-y-4">
          <CompanyConcallSneakPeek />
          <div className="bento-grid-cols-2">
            <CorporateEventsCard />
            <EarningsCalendarCard />
          </div>
        </div>
      )}

      {/* SECTION 5: Institutional Broker Research & Socials */}
      {(activeFilter === "all" || activeFilter === "broker-socials") && (
        <div className="space-y-4">
          <BrokerConsensusSneakPeek />
          <SocialsSentimentSneakPeek />
        </div>
      )}

      {/* SECTION 6: Market Foundation & Global Macro */}
      {(activeFilter === "all" || activeFilter === "markets") && (
        <div className="space-y-4">
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
      )}

      {/* SECTION 7: AI Analysts, Scanners & Cross-Market Detection */}
      {(activeFilter === "all" || activeFilter === "scanners-ai") && (
        <div className="space-y-4">
          <HomeAiFiveAgents />
          <WhatChangedModule />
        </div>
      )}

      {/* Complete Portal Explore Hub & Sitemap */}
      <HomeExploreHub />
    </div>
  );
}
