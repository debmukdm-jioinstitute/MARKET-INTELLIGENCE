"use client";
import { DataStory } from "@/components/ui/data-story";
import { formatDate } from "@/lib/format";
import { breadthHeadline, indexHeadline } from "@/lib/story";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import useSWR from "swr";
import { useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { useWatchlist } from "@/hooks/use-watchlist";
import {
  WelcomeStrip,
  welcomeVisible,
} from "@/components/homedashboard/WelcomeStrip";
import { MarketPulse } from "@/components/homedashboard/MarketPulse";
import { ChartDesk } from "@/components/homedashboard/ChartDesk";
import { BriefTeaser } from "@/components/homedashboard/BriefTeaser";
import { SignatureFive } from "@/components/homedashboard/SignatureFive";
import { MissionsCard } from "@/components/homedashboard/MissionsCard";
import { TsStructure } from "@/components/homedashboard/TsStructure";
import { SmartMoney } from "@/components/homedashboard/SmartMoney";
import { LearnNudge } from "@/components/homedashboard/LearnNudge";
import { PortfolioTeaser } from "@/components/homedashboard/PortfolioTeaser";
import {
  useHomeClock,
  useHomeProgress,
} from "@/components/homedashboard/useHomeProgress";
import { fetchOptions, homeJson } from "@/components/homedashboard/shared";
import type { BriefResponse } from "@/lib/homedashboard/brief";
import { HUBS } from "@/lib/hubs";
import { HubJumpNav } from "@/components/hub/hub-jump-nav";
import { HubSection } from "@/components/hub/hub-section";
import { StartHere } from "@/components/hub/start-here";
import { HubSectionParam } from "@/components/hub/use-hub-section-param";
import DailyBrief from "@/app/(portal)/intelligence/brief/page";
import IntelligenceFeed from "@/app/(portal)/intelligence/page";
import { WorldMonitorFreeDashboard } from "@/components/worldmonitor/world-monitor-free-dashboard";
import { WorldMonitorPageShell } from "@/components/worldmonitor/world-monitor-page-shell";

// Client-only, loaded after the dashboard so it never competes with first paint.
const InstallAppPrompt = dynamic(
  () =>
    import("@/components/pwa/install-app-prompt").then(
      (m) => m.InstallAppPrompt,
    ),
  { ssr: false },
);

export default function DashboardPage() {
  const { data } = useIndiaDashboard(45_000);
  const portfolio = useMyPortfolio();
  const { user, ready, isGuest } = useAuth();
  const authenticated = Boolean(ready && user && !isGuest);
  const visiblePortfolio = {
    ...portfolio,
    locked: portfolio.locked || !authenticated,
  };
  const { items } = useWatchlist(0);
  const { data: brief } = useSWR<BriefResponse>(
    "/api/brief",
    homeJson,
    fetchOptions,
  );
  const now = useHomeClock();
  const p = data?.pulse;
  const b = p?.breadth;
  const movers = [
    { name: "Nifty 50", changePct: p?.nifty?.changePct },
    { name: "Bank Nifty", changePct: p?.bankNifty?.changePct },
    { name: "Sensex", changePct: p?.sensex?.changePct },
  ];
  const progress = useHomeProgress(now);
  // Signed-in holders see their portfolio right under the market pulse (0-tap glance);
  // everyone else keeps the existing order with the teaser at the bottom.
  const dateLabel = now
    ? formatDate(now)
    : "Your daily view";
  const portfolioUpTop = authenticated && portfolio.holdings.length > 0;
  const [force, setForce] = useState<string | null>(null);
  const onTarget = useCallback((id: string) => setForce(id), []);
  const chips = HUBS.today.sections.map((x) => ({ id: x.id, label: x.label }));
  return (
    <>
    <Suspense fallback={null}><HubSectionParam onTarget={onTarget} /></Suspense>
    <HubJumpNav chips={chips} label="Today" onJump={onTarget} />
    <div
      data-home-dashboard
      className="mx-auto max-w-[1440px] space-y-8 rounded-2xl bg-[#FAFAF9] px-3 py-5 pb-12 text-stone-900 [color-scheme:light] sm:space-y-10 sm:px-6"
    >
      <div id="hero" className="scroll-mt-28 space-y-8 sm:space-y-10">
      {welcomeVisible(progress) ? (
        <>
          <h1 className="sr-only">A clearer view. A smarter start.</h1>
          <p className="-mb-4 text-right text-sm text-stone-500 sm:-mb-6">
            {dateLabel}
          </p>
        </>
      ) : (
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              A clearer view. A smarter start.
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Read the market. Explore an idea. Build your investing habit.
            </p>
          </div>
          <p className="text-xs text-stone-500">{dateLabel}</p>
        </header>
      )}
      <WelcomeStrip progress={progress} />
      </div>
      <div id="pulse" className="scroll-mt-28 space-y-8 sm:space-y-10">
      <DataStory
        kicker="Market today"
        asOf={data?.fetchedAt}
        headline={indexHeadline(movers)}
        deck={breadthHeadline(b?.advances, b?.declines) ? `${breadthHeadline(b?.advances, b?.declines)}.` : null}
        howToRead="index moves are against the previous close; the breadth line counts every NSE stock once."
      />
      <MarketPulse data={data} now={now} />
      {portfolioUpTop ? <PortfolioTeaser portfolio={visiblePortfolio} /> : null}
      <TsStructure />
      </div>
      <ChartDesk />
      <BriefTeaser
        data={brief}
        watched={authenticated ? [...items, ...portfolio.holdings] : []}
      />
      <SignatureFive
        brief={brief}
        portfolio={visiblePortfolio.locked ? null : portfolio.data}
        now={now}
      />
      <MissionsCard progress={progress} now={now} />
      <SmartMoney data={data} />
      <LearnNudge />
      {portfolioUpTop ? null : <PortfolioTeaser portfolio={visiblePortfolio} />}
      {authenticated ? <InstallAppPrompt /> : null}
    </div>
    <div className="mx-auto mt-8 max-w-[1440px] space-y-8 px-3 pb-12 sm:px-6">
      <HubSection id="brief" title="Daily brief" force={force === "brief"}><DailyBrief /></HubSection>
      <HubSection id="feed" title="Intelligence feed" force={force === "feed"}><IntelligenceFeed /></HubSection>
      <HubSection id="world-monitor" title="World monitor" force={force === "world-monitor"}><WorldMonitorPageShell><WorldMonitorFreeDashboard /></WorldMonitorPageShell></HubSection>
      <HubSection id="start-here" title="Start here" force={force === "start-here"}><StartHere /></HubSection>
    </div>
    </>
  );
}
