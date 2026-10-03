"use client";

import useSWR from "swr";
import { useAuth } from "@/components/providers/auth-provider";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { useWatchlist } from "@/hooks/use-watchlist";
import { WelcomeStrip } from "@/components/homedashboard/WelcomeStrip";
import { MarketPulse } from "@/components/homedashboard/MarketPulse";
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
  return (
    <div
      data-home-dashboard
      className="mx-auto max-w-[1440px] space-y-8 rounded-2xl bg-[#FAFAF9] px-3 py-5 pb-12 text-stone-900 [color-scheme:light] sm:space-y-10 sm:px-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">
            YOUR DAILY MARKET COMPANION
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            A clearer view. A smarter start.
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Read the market. Explore an idea. Build your investing habit.
          </p>
        </div>
        <p className="text-xs text-stone-500">
          {now
            ? now.toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            : "Your daily view"}
        </p>
      </header>
      <WelcomeStrip progress={progress} />
      <MarketPulse data={data} now={now} />
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
      <PortfolioTeaser portfolio={visiblePortfolio} />
    </div>
  );
}
