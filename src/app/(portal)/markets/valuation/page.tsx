"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MarketValuationCard } from "@/components/dashboard/market-valuation-card";
import { Scale, BarChart2 } from "lucide-react";

export default function MarketValuationPage() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Equity Risk Premium"
        title="Market Valuation & Yield Spread Dashboard"
        subtitle="Historical trailing and forward P/E bands, CAPE ratios, price-to-book, and bond-equity earnings yield spreads for Indian equities."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MarketValuationCard />

        <div className="rounded-xl border border-border bg-card p-6 space-y-4 font-mono text-xs shadow-sm">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="size-4 text-primary" />
            EQUITY RISK PREMIUM & YIELD SPREAD
          </h3>

          <div className="space-y-3 divide-y divide-border/50">
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">NIFTY Earnings Yield (1 / PE):</span>
              <span className="font-bold text-foreground">4.58%</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">India 10Y G-Sec Yield:</span>
              <span className="font-bold text-foreground">6.82%</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">Yield Spread (G-Sec - Earnings Yield):</span>
              <span className="font-bold text-amber-400">224 bps (Slightly Stretched)</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground">Historical 10Y Mean Spread:</span>
              <span className="font-bold text-muted-foreground">185 bps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
