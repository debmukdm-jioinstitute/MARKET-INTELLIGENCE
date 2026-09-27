"use client";

import { CommandPalette } from "@/components/command-palette/command-palette";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { GuestBanner } from "@/components/layout/guest-banner";
import { MobileNavProvider } from "@/components/layout/mobile-nav-provider";
import { AppNav, BottomTabBar } from "@/components/layout/app-nav";
import { PortalWayfinding } from "@/components/layout/portal-wayfinding";
import { UpdatesBanner } from "@/components/layout/updates-banner";
import { PageviewTracker } from "@/components/layout/pageview-tracker";
import { LiveStreamTicker } from "@/components/macro/live-stream-ticker";
import { TopBar } from "@/components/layout/top-bar";
import { PortfolioProvider } from "@/components/providers/portfolio-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuidedTour } from "@/components/guided-tour";
import { PortalPageGuard } from "@/components/layout/portal-page-guard";
import { PortalPageTransition } from "@/components/layout/portal-page-transition";
import { SiteAssistantWidget } from "@/components/site-assistant/site-assistant-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <PortfolioProvider>
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
                <PortalPageGuard>
                  <PortalPageTransition>{children}</PortalPageTransition>
                </PortalPageGuard>
              </main>
              <BottomTabBar />
            </div>
            <CommandPalette />
            <SiteAssistantWidget />
            <GuidedTour />
            <PageviewTracker />
          </MobileNavProvider>
        </CommandPaletteProvider>
      </PortfolioProvider>
    </TooltipProvider>
  );
}
