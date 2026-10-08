"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
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
import { SmartMoney } from "@/components/homedashboard/SmartMoney";
import { LearnNudge } from "@/components/homedashboard/LearnNudge";
import { PortfolioTeaser } from "@/components/homedashboard/PortfolioTeaser";
import {
  useHomeClock,
  useHomeProgress,
} from "@/components/homedashboard/useHomeProgress";
import { fetchOptions, homeJson } from "@/components/homedashboard/shared";
import type { BriefResponse } from "@/lib/homedashboard/brief";

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
  const progress = useHomeProgress(now);
  // Signed-in holders see their portfolio right under the market pulse (0-tap glance);
  // everyone else keeps the existing order with the teaser at the bottom.
  const dateLabel = now
    ? now.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "Your daily view";
  const portfolioUpTop = authenticated && portfolio.holdings.length > 0;
  return (
    <div
      data-home-dashboard
      className="mx-auto max-w-[1440px] space-y-8 rounded-2xl bg-[#FAFAF9] px-3 py-5 pb-12 text-stone-900 [color-scheme:light] sm:space-y-10 sm:px-6"
    >
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
      <MarketPulse data={data} now={now} />
      {portfolioUpTop ? <PortfolioTeaser portfolio={visiblePortfolio} /> : null}
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
  );
}
