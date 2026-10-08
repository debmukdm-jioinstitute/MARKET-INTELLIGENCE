"use client";

import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { GuestBanner } from "@/components/layout/guest-banner";
import { MobileNavProvider } from "@/components/layout/mobile-nav-provider";
import { AppNav, BottomTabBar } from "@/components/layout/app-nav";
import { PortalWayfinding } from "@/components/layout/portal-wayfinding";
import { UpdatesBanner } from "@/components/layout/updates-banner";
import { PageviewTracker } from "@/components/layout/pageview-tracker";
import { LiveStreamTicker } from "@/components/macro/live-stream-ticker";
import { TopBar } from "@/components/layout/top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortalPageGuard } from "@/components/layout/portal-page-guard";
import { PortalPageTransition } from "@/components/layout/portal-page-transition";
import { RouteProvenanceBar } from "@/components/feeds/route-provenance-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { PortalDocumentTitle } from "@/components/layout/portal-document-title";
import { IndiaDashboardWarmup } from "@/components/providers/india-dashboard-warmup";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Overlay widgets that are closed on first paint: load them as separate client-only chunks
// so their JS (assistant/AI SDK, driver.js, cmdk) is not parsed or hydrated with the page.
const CommandPalette = dynamic(() => import("@/components/command-palette/command-palette").then((m) => m.CommandPalette), { ssr: false });
const SiteAssistantWidget = dynamic(
  () => import("@/components/site-assistant/site-assistant-panel").then((m) => m.SiteAssistantWidget),
  { ssr: false },
);
const GuidedTour = dynamic(() => import("@/components/guided-tour").then((m) => m.GuidedTour), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <IndiaDashboardWarmup />
        <CommandPaletteProvider>
          <MobileNavProvider>
            <div className="flex min-h-screen flex-col bg-background text-foreground">
              <AppNav />
              <GuestBanner />
              <UpdatesBanner />
              <LiveStreamTicker />
              <TopBar />
              <main className="portal-main flex-1 overflow-x-hidden px-3 pt-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pt-4 md:p-5 md:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:pb-5">
                <PortalWayfinding />
                <RouteProvenanceBar />
                <PortalPageGuard>
                  <PortalPageTransition>{children}</PortalPageTransition>
                </PortalPageGuard>
              </main>
              <SiteFooter />
              <BottomTabBar />
            </div>
            <CommandPalette />
            <SiteAssistantWidget />
            <GuidedTour />
            <Suspense fallback={null}>
              <PortalDocumentTitle />
            </Suspense>
            <PageviewTracker />
          </MobileNavProvider>
        </CommandPaletteProvider>
    </TooltipProvider>
  );
}
