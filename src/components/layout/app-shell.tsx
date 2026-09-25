"use client";

import { CommandPalette } from "@/components/command-palette/command-palette";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { GuestBanner } from "@/components/layout/guest-banner";
import { MobileNavProvider } from "@/components/layout/mobile-nav-provider";
import { AppNav } from "@/components/layout/app-nav";
import { UpdatesBanner } from "@/components/layout/updates-banner";
import { PageviewTracker } from "@/components/layout/pageview-tracker";
import { LiveStreamTicker } from "@/components/macro/live-stream-ticker";
import { TopBar } from "@/components/layout/top-bar";
import { PortfolioProvider } from "@/components/providers/portfolio-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuidedTour } from "@/components/guided-tour";
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
              <main className="flex-1 overflow-y-auto p-4 md:p-5">{children}</main>
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
