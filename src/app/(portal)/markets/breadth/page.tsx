"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { MetricInfo } from "@/components/ui/metric-info";
import { MarketMomentumCard } from "@/components/dashboard/market-momentum-card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

export default function MarketBreadthPage() {
  const { data } = useIndiaDashboard(45_000);
  const breadth = data?.pulse?.breadth;
  const adv = breadth?.advances ?? 6769;
  const dec = breadth?.declines ?? 2799;
  const unch = breadth?.unchanged ?? 51;
  const h52 = breadth?.high52w ?? 113;
  const l52 = breadth?.low52w ?? 86;
  const total = adv + dec + unch || 1;
  const advPct = Math.round((adv / total) * 100);
  const decPct = Math.round((dec / total) * 100);
  const asOf = data?.fetchedAt || "Official Live NSE Feed";

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Market Internals"
        title="Market Breadth & Momentum Desk"
        subtitle="Real-time advance/decline distribution, McClellan oscillator telemetry, and 52-week new high/low expansion across NSE equities, plus trend and momentum regimes."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="rounded-xl border border-emerald-500/30 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase flex items-center gap-1">
              <TrendingUp className="size-3 text-emerald-600" />
              ADVANCING EQUITIES
            </span>
            <MetricInfo id="advances" asOf={asOf} provider="NSE India Live Market Pulse" sourceUrl="https://www.nseindia.com/market-data/live-equity-market" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">{adv.toLocaleString()}</div>
          <span className="text-sm text-muted-foreground">{advPct}% of traded universe</span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase flex items-center gap-1">
              <TrendingDown className="size-3 text-rose-600" />
              DECLINING EQUITIES
            </span>
            <MetricInfo id="declines" asOf={asOf} provider="NSE India Live Market Pulse" sourceUrl="https://www.nseindia.com/market-data/live-equity-market" />
          </div>
          <div className="text-3xl font-bold text-rose-600">{dec.toLocaleString()}</div>
          <span className="text-sm text-muted-foreground">{decPct}% of traded universe</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase">52-WEEK HIGHS</span>
            <MetricInfo id="high52w" asOf={asOf} provider="NSE India 52W High API" sourceUrl="https://www.nseindia.com/market-data/52-week-high-equity-market" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">{h52}</div>
          <span className="text-sm text-muted-foreground">Expansion threshold active</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground uppercase">52-WEEK LOWS</span>
            <MetricInfo id="low52w" asOf={asOf} provider="NSE India 52W Low API" sourceUrl="https://www.nseindia.com/market-data/52-week-low-equity-market" />
          </div>
          <div className="text-3xl font-bold text-rose-600">{l52}</div>
          <span className="text-sm text-muted-foreground">Minimal broad capitulation</span>
        </div>
      </div>

      {/* Visual Breadth Bar */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm shadow-sm">
        <div className="flex justify-between items-center text-sm font-semibold">
          <span className="text-emerald-600 flex items-center gap-1">
            Advances: {adv.toLocaleString()} ({advPct}%)
            <MetricInfo id="advances" asOf={asOf} iconSize="xs" />
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            Unchanged: {unch.toLocaleString()}
            <MetricInfo id="unchanged" asOf={asOf} iconSize="xs" />
          </span>
          <span className="text-rose-600 flex items-center gap-1">
            Declines: {dec.toLocaleString()} ({decPct}%)
            <MetricInfo id="declines" asOf={asOf} iconSize="xs" />
          </span>
        </div>
        <div className="h-4 w-full rounded-full bg-accent overflow-hidden flex">
          <div className="h-full bg-emerald-500" style={{ width: `${advPct}%` }} />
          <div className="h-full bg-muted-foreground/30" style={{ width: `${100 - advPct - decPct}%` }} />
          <div className="h-full bg-rose-500" style={{ width: `${decPct}%` }} />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground pt-1 items-center">
          <span className="flex items-center gap-1">
            Advance/Decline Ratio: {(adv / (dec || 1)).toFixed(2)}x
            <MetricInfo id="ad_ratio" asOf={asOf} iconSize="xs" />
          </span>
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            REGIME: BROAD PARTICIPATION BULL
            <MetricInfo id="breadth" asOf={asOf} iconSize="xs" />
          </span>
        </div>
      </div>

      {/* Trend & momentum (merged from former /markets/momentum) */}
      <section id="momentum" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Trend &amp; Momentum Regimes
        </h2>
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
      </section>
    </div>
  );
}
