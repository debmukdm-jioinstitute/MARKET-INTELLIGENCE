"use client";

import type { SiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import type { IndiaDashboardQuickPayload } from "@/lib/feeds/india/build-dashboard";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import type { ProofSymbol } from "@/lib/marketing/landing-v2/copy";
import { createContext, useContext, type ReactNode } from "react";

export type LandingDashboardSeed = IndiaDashboardPayload | IndiaDashboardQuickPayload;

export type LandingPageSeed = {
  dashboard: LandingDashboardSeed | null;
  researchBySymbol: Partial<Record<ProofSymbol, ResearchDetailPayload>>;
  siteBrief: SiteWideExecutiveBrief | null;
};

const defaultSeed: LandingPageSeed = {
  dashboard: null,
  researchBySymbol: {},
  siteBrief: null,
};

const LandingSeedContext = createContext<LandingPageSeed>(defaultSeed);

export function LandingSeedProvider({
  seed,
  children,
}: {
  seed: LandingPageSeed;
  children: ReactNode;
}) {
  return <LandingSeedContext.Provider value={seed}>{children}</LandingSeedContext.Provider>;
}

export function useLandingPageSeed(): LandingPageSeed {
  return useContext(LandingSeedContext);
}

export function useLandingDashboardSeed(): LandingDashboardSeed | null {
  return useContext(LandingSeedContext).dashboard;
}

export function useLandingResearchSeed(symbol: ProofSymbol): ResearchDetailPayload | null {
  return useContext(LandingSeedContext).researchBySymbol[symbol] ?? null;
}

export function useLandingSiteBriefSeed(): SiteWideExecutiveBrief | null {
  return useContext(LandingSeedContext).siteBrief;
}

/** Back-compat wrapper for landing tree. */
export function LandingDashboardProvider({
  initialDashboard,
  researchBySymbol = {},
  siteBrief = null,
  children,
}: {
  initialDashboard: LandingDashboardSeed | null;
  researchBySymbol?: Partial<Record<ProofSymbol, ResearchDetailPayload>>;
  siteBrief?: SiteWideExecutiveBrief | null;
  children: ReactNode;
}) {
  return (
    <LandingSeedProvider
      seed={{
        dashboard: initialDashboard,
        researchBySymbol,
        siteBrief,
      }}
    >
      {children}
    </LandingSeedProvider>
  );
}
