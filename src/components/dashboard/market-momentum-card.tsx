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
    <div className="relative overflow-hidden rounded-2xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-[var(--shadow-sm)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <Flame className="size-4 text-primary" />
              Market Momentum & Regimes
            </span>
            <MetricInfo metric="dma" sourceOverride={techSource} customTitle="Trend & Momentum Suite" />
          </div>
          <Link
            href="/markets/momentum"
            className="group flex items-center gap-1 rounded-full border border-border bg-accent/30 px-3 py-1.5 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Momentum
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          {/* DMA Dispersions with MetricInfo */}
          <div className="rounded-xl border border-border/70 bg-card/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Moving Average Regimes
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
            <div className="rounded-xl border border-border/70 bg-card/40 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs uppercase">RSI (14D)</span>
                <MetricInfo metric="rsi" sourceOverride={techSource} />
              </div>
              <span className="font-bold text-foreground text-base mt-0.5 block">62.40</span>
              <span className="text-xs text-emerald-600">Bullish Momentum</span>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/40 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs uppercase">MACD Signal</span>
                <MetricInfo metric="macd" sourceOverride={techSource} />
              </div>
              <span className="font-bold text-emerald-600 text-base mt-0.5 block">Positive</span>
              <span className="text-xs text-muted-foreground">Histogram Expansion</span>
            </div>
          </div>

          {/* Breadth Thrust with MetricInfo */}
          <div className="rounded-xl border border-border/70 bg-card/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Breadth Thrust Ratio</span>
                <MetricInfo metric="breadth" />
              </div>
              <span className="font-bold text-emerald-600">1.74x Net Advances</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-sm">
        <span className="text-muted-foreground">Status:</span>
        <span className="text-emerald-600 font-semibold">
          High-conviction trend continuation regime
        </span>
      </div>
    </div>
  );
}
