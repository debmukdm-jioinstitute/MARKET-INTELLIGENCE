"use client";

import Link from "next/link";
import { ArrowUpRight, Flame, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function MarketMomentumCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Flame className="size-3.5" />
              MARKET MOMENTUM
            </span>
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
          {/* DMA Dispersions */}
          <div className="rounded-xl border border-border/70 bg-card/50 p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              MOVING AVERAGE DISPERSIONS
            </span>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">NIFTY vs 20 DMA</span>
              <span className="font-bold text-emerald-400">+2.1% (Short-term expansion)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">NIFTY vs 50 DMA</span>
              <span className="font-bold text-emerald-400">+4.8% (Medium-term bull trend)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">NIFTY vs 200 DMA</span>
              <span className="font-bold text-emerald-400">+7.2% (Structural regime)</span>
            </div>
          </div>

          {/* Technical Momentum Indicators */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/70 bg-card/40 p-3">
              <span className="text-muted-foreground block text-[10px] uppercase">RSI (14D)</span>
              <span className="font-bold text-foreground text-sm mt-0.5 block">62.4</span>
              <span className="text-[10px] text-muted-foreground">Upper Neutral Zone</span>
            </div>

            <div className="rounded-lg border border-border/70 bg-card/40 p-3">
              <span className="text-muted-foreground block text-[10px] uppercase">MACD Signal</span>
              <span className="font-bold text-emerald-400 text-sm mt-0.5 block">Positive</span>
              <span className="text-[10px] text-muted-foreground">Histogram Expanding</span>
            </div>
          </div>

          {/* Market Breadth & Internals Status */}
          <div className="rounded-xl border border-border/70 bg-card/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cumulative Breadth Thrust</span>
              <span className="font-bold text-emerald-400">Improving (Net Adv 1.74x)</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">India VIX Vol Regime</span>
              <span className="font-bold text-foreground">14.82 (Sub-15 Contraction)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        <span className="text-[10px] text-muted-foreground">ANALYTICAL REGIME:</span>
        <span className="text-[10px] text-emerald-400 font-semibold">
          Trend Continuation with Low Volatility Expansion
        </span>
      </div>
    </div>
  );
}
