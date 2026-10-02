"use client";

import type { IndiaDashboardQuickPayload } from "@/lib/feeds/india/build-dashboard";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { createContext, useContext, type ReactNode } from "react";

export type LandingDashboardSeed = IndiaDashboardPayload | IndiaDashboardQuickPayload;

const LandingDashboardContext = createContext<LandingDashboardSeed | null>(null);

export function LandingDashboardProvider({
  initialDashboard,
  children,
}: {
  initialDashboard: LandingDashboardSeed | null;
  children: ReactNode;
}) {
  return (
    <LandingDashboardContext.Provider value={initialDashboard}>{children}</LandingDashboardContext.Provider>
  );
}

export function useLandingDashboardSeed(): LandingDashboardSeed | null {
  return useContext(LandingDashboardContext);
}
