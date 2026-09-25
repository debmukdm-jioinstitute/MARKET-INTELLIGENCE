"use client";

import { CommandPalette } from "@/components/command-palette/command-palette";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { GuestBanner } from "@/components/layout/guest-banner";
import { MobileNavProvider } from "@/components/layout/mobile-nav-provider";
import { AppNav, BottomTabBar } from "@/components/layout/app-nav";
import { GroupTabs } from "@/components/layout/group-tabs";
import { UpdatesBanner } from "@/components/layout/updates-banner";
import { PageviewTracker } from "@/components/layout/pageview-tracker";
import { LiveStreamTicker } from "@/components/macro/live-stream-ticker";
import { TopBar } from "@/components/layout/top-bar";
import { PortfolioProvider } from "@/components/providers/portfolio-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuidedTour } from "@/components/guided-tour";

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
              <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-5 lg:pb-5">
                <GroupTabs />
                {children}
              </main>
              <BottomTabBar />
            </div>
            <CommandPalette />
            <GuidedTour />
            <PageviewTracker />
          </MobileNavProvider>
        </CommandPaletteProvider>
      </PortfolioProvider>
    </TooltipProvider>
  );
}
