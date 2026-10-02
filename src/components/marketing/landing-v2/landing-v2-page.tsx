"use client";

import type { SiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import type { ProofSymbol } from "@/lib/marketing/landing-v2/copy";
import { LandingDashboardProvider, type LandingDashboardSeed } from "./landing-dashboard-context";
import { LandingScrollSpy } from "./scroll-spy";
import { LandingHeader } from "./section-header";
import { LandingHeroSection } from "./section-hero";
import { LandingProofSection } from "./section-proof";
import { LandingMarketBoardSection } from "./section-market-board";
import {
  LandingAiDeskSection,
  LandingAlertsSection,
  LandingFooter,
  LandingFounderSection,
  LandingMacroSection,
  LandingPortfolioSection,
  LandingPricingSection,
  LandingTrustSection,
  LandingUseCasesSection,
} from "./section-bottom";
import { LandingShell } from "./ui";

export function LandingV2Page({
  initialDashboard = null,
  researchBySymbol = {},
  siteBrief = null,
}: {
  initialDashboard?: LandingDashboardSeed | null;
  researchBySymbol?: Partial<Record<ProofSymbol, ResearchDetailPayload>>;
  siteBrief?: SiteWideExecutiveBrief | null;
}) {
  return (
    <LandingDashboardProvider
      initialDashboard={initialDashboard}
      researchBySymbol={researchBySymbol}
      siteBrief={siteBrief}
    >
    <LandingShell>
      <LandingScrollSpy />
      <LandingHeader />
      <main>
        <LandingHeroSection />
        <LandingProofSection />
        <LandingUseCasesSection />
        <LandingAiDeskSection />
        <LandingMarketBoardSection />
        <LandingPortfolioSection />
        <LandingAlertsSection />
        <LandingMacroSection />
        <LandingTrustSection />
        <LandingPricingSection />
        <LandingFounderSection />
      </main>
      <LandingFooter />
    </LandingShell>
    </LandingDashboardProvider>
  );
}
