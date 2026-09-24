"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { MarketMomentumCard } from "@/components/dashboard/market-momentum-card";
import { MetricInfo } from "@/components/ui/metric-info";
import { Flame, Activity, TrendingUp } from "lucide-react";

export default function MarketMomentumPage() {
  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Technical Diagnostics"
        title="Market Momentum & Trend Regimes"
        subtitle="Analytical moving average dispersions, relative strength indicators, and trend continuation oscillators."
      />

      <div className="bento-grid-cols-2">
        <MarketMomentumCard />

        <Panel
          title={
            <span className="flex items-center gap-1.5">
              <Activity className="size-4 text-primary" />
              Benchmark Trend Strength Summary
            </span>
          }
        >
          <div className="space-y-3 divide-y divide-border/50 text-sm">
            <div className="pt-2 first:pt-0 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                NIFTY 50 Short-Term Trend (20 DMA):
                <MetricInfo id="dma20" iconSize="xs" />
              </span>
              <span className="font-bold text-emerald-600">Bullish Continuation (+2.1%)</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Medium-Term Trend (50 DMA):
                <MetricInfo id="dma50" iconSize="xs" />
              </span>
              <span className="font-bold text-emerald-600">Expanding Channel (+4.8%)</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Macro Structural Trend (200 DMA):
                <MetricInfo id="dma200" iconSize="xs" />
              </span>
              <span className="font-bold text-emerald-600">Primary Bull Market (+7.2%)</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                RSI Momentum State:
                <MetricInfo id="rsi" iconSize="xs" />
              </span>
              <span className="font-bold text-foreground">62.4 (Upper Bull Zone)</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
