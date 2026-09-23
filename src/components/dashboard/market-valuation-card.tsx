"use client";

import Link from "next/link";
import { ArrowUpRight, Scale } from "lucide-react";
import { MetricInfo } from "@/components/ui/metric-info";

export function MarketValuationCard() {
  const nseSource = {
    provider: "NSE India (Index PE/PB/Yield Reports)",
    url: "https://www.nseindia.com/reports-indices-historical-pepb",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Scale className="size-3.5" />
              MARKET VALUATION MULTIPLES
            </span>
            <MetricInfo metric="pe_ratio" sourceOverride={nseSource} customTitle="NSE Valuation Suite" />
          </div>
          <Link
            href="/markets/valuation"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Valuation
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-4 font-mono text-xs">
          {/* NIFTY P/E Highlights with MetricInfo */}
          <div className="rounded-xl border border-border/70 bg-card/50 p-3.5 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-1">
                <span className="text-foreground font-semibold">NIFTY 50 Trailing P/E</span>
                <MetricInfo metric="pe_ratio" sourceOverride={nseSource} />
              </div>
              <span className="font-bold text-base text-foreground">21.84x</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <div className="flex items-center gap-1">
                <span>5Y Historical Average P/E</span>
                <MetricInfo metric="pe_ratio" customTitle="5-Year Historical Average P/E" sourceOverride={nseSource} />
              </div>
              <span className="font-semibold text-foreground">20.42x</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <div className="flex items-center gap-1">
                <span>10Y Historical Average P/E</span>
                <MetricInfo metric="pe_ratio" customTitle="10-Year Historical Average P/E" sourceOverride={nseSource} />
              </div>
              <span className="font-semibold text-foreground">19.78x</span>
            </div>

            {/* Visual Valuation Meter */}
            <div className="pt-2">
              <div className="flex justify-between text-[9px] text-muted-foreground mb-1 uppercase">
                <span>Undervalued (17x)</span>
                <span>Fair (20x)</span>
                <span>Rich (24x)</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-accent overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 bg-blue-600 rounded-full"
                  style={{ left: "62%", width: "12px" }}
                />
              </div>
            </div>
          </div>

          {/* Other Multiples with MetricInfo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/70 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px] uppercase">NIFTY P/B</span>
                <MetricInfo metric="pb_ratio" sourceOverride={nseSource} />
              </div>
              <span className="font-bold text-foreground text-sm mt-0.5 block">3.12x</span>
            </div>

            <div className="rounded-lg border border-border/70 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px] uppercase">Dividend Yield</span>
                <MetricInfo metric="div_yield" sourceOverride={nseSource} />
              </div>
              <span className="font-bold text-foreground text-sm mt-0.5 block">1.22%</span>
            </div>
          </div>

          {/* Yield Spread Callout */}
          <div className="rounded-xl border border-border/70 bg-card/40 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Bond-Equity Yield Spread</span>
                <MetricInfo metric="yield_spread" />
              </div>
              <span className="font-bold text-blue-600">224 bps (Mild Premium)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        <Link
          href="/markets/valuation"
          className="text-primary hover:underline text-[11px] flex items-center gap-1"
        >
          View Full Valuation & Yield Spread Dashboard →
        </Link>
      </div>
    </div>
  );
}
