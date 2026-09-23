"use client";

import Link from "next/link";
import { ArrowUpRight, Flame } from "lucide-react";
import { MetricInfo } from "@/components/ui/metric-info";

export function MarketMomentumCard() {
  const techSource = {
    provider: "NSE / Yahoo Daily Closes Analytics Engine",
    url: "https://finance.yahoo.com/quote/%5ENSEI/history",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Flame className="size-3.5" />
              MARKET MOMENTUM & REGIMES
            </span>
            <MetricInfo metric="dma" sourceOverride={techSource} customTitle="Trend & Momentum Suite" />
          </div>
          <Link
            href="/markets/momentum"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Momentum
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-4 font-mono text-xs">
          {/* DMA Dispersions with MetricInfo */}
          <div className="rounded-xl border border-border/70 bg-card/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                MOVING AVERAGE REGIMES
              </span>
              <MetricInfo metric="dma" sourceOverride={techSource} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">NIFTY vs 20 DMA</span>
                <MetricInfo metric="dma" customTitle="20-Day Moving Average" sourceOverride={techSource} />
              </div>
              <span className="font-bold text-emerald-600">+2.10% (Short-term expansion)</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">NIFTY vs 50 DMA</span>
                <MetricInfo metric="dma" customTitle="50-Day Moving Average" sourceOverride={techSource} />
              </div>
              <span className="font-bold text-emerald-600">+4.80% (Intermediate bull)</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">NIFTY vs 200 DMA</span>
                <MetricInfo metric="dma" customTitle="200-Day Structural Trend" sourceOverride={techSource} />
              </div>
              <span className="font-bold text-emerald-600">+7.20% (Structural regime)</span>
            </div>
          </div>

          {/* Technical Momentum Indicators with MetricInfo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/70 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px] uppercase">RSI (14D)</span>
                <MetricInfo metric="rsi" sourceOverride={techSource} />
              </div>
              <span className="font-bold text-foreground text-sm mt-0.5 block">62.40</span>
              <span className="text-[10px] text-emerald-600">Bullish Momentum</span>
            </div>

            <div className="rounded-lg border border-border/70 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px] uppercase">MACD Signal</span>
                <MetricInfo metric="macd" sourceOverride={techSource} />
              </div>
              <span className="font-bold text-emerald-600 text-sm mt-0.5 block">Positive</span>
              <span className="text-[10px] text-muted-foreground">Histogram Expansion</span>
            </div>
          </div>

          {/* Breadth Thrust with MetricInfo */}
          <div className="rounded-xl border border-border/70 bg-card/40 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Breadth Thrust Ratio</span>
                <MetricInfo metric="breadth" />
              </div>
              <span className="font-bold text-emerald-600">1.74x Net Advances</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        <span className="text-[10px] text-muted-foreground">STATUS:</span>
        <span className="text-[10px] text-emerald-600 font-semibold">
          High-conviction trend continuation regime
        </span>
      </div>
    </div>
  );
}
