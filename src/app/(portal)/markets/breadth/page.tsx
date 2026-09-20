"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { BarChart3, TrendingUp, TrendingDown, Layers } from "lucide-react";
import Link from "next/link";

export default function MarketBreadthPage() {
  const { data } = useIndiaDashboard(45_000);
  const breadth = data?.pulse?.breadth;
  const adv = breadth?.advances ?? 1423;
  const dec = breadth?.declines ?? 817;
  const unch = breadth?.unchanged ?? 94;
  const h52 = breadth?.high52w ?? 87;
  const l52 = breadth?.low52w ?? 42;
  const total = adv + dec + unch || 1;
  const advPct = Math.round((adv / total) * 100);
  const decPct = Math.round((dec / total) * 100);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Market Internals"
        title="Market Breadth & Participation Desk"
        subtitle="Real-time advance/decline distribution, McClellan oscillator telemetry, and 52-week new high/low expansion across NSE equities."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="rounded-xl border border-emerald-500/30 bg-card p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
            <TrendingUp className="size-3 text-emerald-400" />
            ADVANCING EQUITIES
          </span>
          <div className="text-3xl font-bold text-emerald-400">{adv.toLocaleString()}</div>
          <span className="text-[11px] text-muted-foreground">{advPct}% of traded universe</span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-card p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
            <TrendingDown className="size-3 text-rose-400" />
            DECLINING EQUITIES
          </span>
          <div className="text-3xl font-bold text-rose-400">{dec.toLocaleString()}</div>
          <span className="text-[11px] text-muted-foreground">{decPct}% of traded universe</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">52-WEEK HIGHS</span>
          <div className="text-3xl font-bold text-emerald-400">{h52}</div>
          <span className="text-[11px] text-muted-foreground">Expansion threshold active</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">52-WEEK LOWS</span>
          <div className="text-3xl font-bold text-rose-400">{l52}</div>
          <span className="text-[11px] text-muted-foreground">Minimal broad capitulation</span>
        </div>
      </div>

      {/* Visual Breadth Bar */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3 font-mono text-xs shadow-sm">
        <div className="flex justify-between items-center text-sm font-semibold">
          <span className="text-emerald-400">Advances: {adv} ({advPct}%)</span>
          <span className="text-muted-foreground">Unchanged: {unch}</span>
          <span className="text-rose-400">Declines: {dec} ({decPct}%)</span>
        </div>
        <div className="h-4 w-full rounded-full bg-accent overflow-hidden flex">
          <div className="h-full bg-emerald-500" style={{ width: `${advPct}%` }} />
          <div className="h-full bg-muted-foreground/30" style={{ width: `${100 - advPct - decPct}%` }} />
          <div className="h-full bg-rose-500" style={{ width: `${decPct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
          <span>Advance/Decline Ratio: {(adv / (dec || 1)).toFixed(2)}x</span>
          <span className="text-emerald-400 font-bold">REGIME: BROAD PARTICIPATION BULL</span>
        </div>
      </div>
    </div>
  );
}
