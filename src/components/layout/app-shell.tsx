"use client";

import { CommandPalette } from "@/components/command-palette/command-palette";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";
import { GuestBanner } from "@/components/layout/guest-banner";
import { MarketTickerRail } from "@/components/layout/market-ticker-rail";
import { Sidebar } from "@/components/layout/sidebar";
import { LiveStreamTicker } from "@/components/macro/live-stream-ticker";
import { TopBar } from "@/components/layout/top-bar";
import { PortfolioProvider } from "@/components/providers/portfolio-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <PortfolioProvider>
        <CommandPaletteProvider>
          <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <GuestBanner />
              <MarketTickerRail />
              <TopBar />
              <LiveStreamTicker />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
          <CommandPalette />
        </CommandPaletteProvider>
      </PortfolioProvider>
    </TooltipProvider>
  );
}
