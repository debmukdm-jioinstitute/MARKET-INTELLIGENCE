"use client";

import Link from "next/link";
import { ArrowUpRight, Flame } from "lucide-react";
import { MetricInfo } from "@/components/ui/metric-info";
import { useNiftyMomentum } from "@/hooks/use-nifty-momentum";
import { formatDmaLine } from "@/lib/market/nifty-technicals";
import { cn } from "@/lib/utils";

export function MarketMomentumCard() {
  const { momentum, loading, error } = useNiftyMomentum();
  const techSource = {
    provider: "Yahoo Finance NIFTY 50 (^NSEI) daily closes",
    url: "https://finance.yahoo.com/quote/%5ENSEI/history",
  };

  const tone = (v: number | null) =>
    v == null ? "text-muted-foreground" : v >= 0 ? "text-emerald-600" : "text-rose-600";

  return (
    <div className="bento-card-shell bento-card-stack bg-gradient-to-b from-card to-card/60">
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
            href="/markets/breadth#momentum"
            className="group flex items-center gap-1 rounded-full border border-border bg-accent/30 px-3 py-1.5 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Momentum
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {loading ? <p className="mt-3 text-sm text-muted-foreground">Loading NIFTY trend data…</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-600">Trend data unavailable: {error}</p> : null}

        {momentum && !loading ? (
          <div className="mt-3 space-y-4 text-sm">
            <div className="rounded-xl border border-border/70 bg-card/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
                  Moving Average Regimes
                </span>
                <MetricInfo metric="dma" sourceOverride={techSource} />
              </div>

              {(
                [
                  ["NIFTY vs 20 DMA", momentum.vsDma20, "Short-term"],
                  ["NIFTY vs 50 DMA", momentum.vsDma50, "Intermediate"],
                  ["NIFTY vs 200 DMA", momentum.vsDma200, "Structural"],
                ] as const
              ).map(([label, pct, sub]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn("font-bold tabular-nums", tone(pct))}>{formatDmaLine(pct, sub)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/70 bg-card/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm uppercase">RSI (14D)</span>
                  <MetricInfo metric="rsi" sourceOverride={techSource} />
                </div>
                <span className="font-bold text-foreground text-base mt-0.5 block tabular-nums">
                  {momentum.rsi14 != null ? momentum.rsi14.toFixed(2) : "—"}
                </span>
                <span className={cn("text-sm", tone(momentum.rsi14 != null && momentum.rsi14 > 50 ? 1 : -1))}>
                  {momentum.rsi14 == null ? "—" : momentum.rsi14 > 70 ? "Overbought zone" : momentum.rsi14 < 30 ? "Oversold zone" : "Neutral momentum"}
                </span>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm uppercase">MACD hist</span>
                  <MetricInfo metric="macd" sourceOverride={techSource} />
                </div>
                <span className={cn("font-bold text-base mt-0.5 block tabular-nums", tone(momentum.macdHist))}>
                  {momentum.macdHist != null ? momentum.macdHist.toFixed(2) : "—"}
                </span>
                <span className="text-sm text-muted-foreground">{momentum.regimeLabel}</span>
              </div>
            </div>
            {momentum.asOf ? (
              <p className="text-xs text-muted-foreground">As of last daily close: {momentum.asOf}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
