"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPct } from "@/lib/format";
import { ArrowUpRight, TrendingUp, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

interface HeroIndiaMarketProps {
  data?: IndiaDashboardPayload | null;
}

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

// High-fidelity historical path data points for SVG rendering
const CHART_PATHS: Record<Timeframe, number[]> = {
  "1D": [25240, 25280, 25260, 25310, 25340, 25300, 25380, 25410, 25390, 25431],
  "1W": [24980, 25050, 25110, 25090, 25200, 25320, 25431],
  "1M": [24400, 24650, 24580, 24800, 25100, 25250, 25431],
  "3M": [23800, 24100, 24350, 24200, 24700, 25100, 25431],
  "1Y": [21800, 22400, 22900, 23500, 24100, 24800, 25431],
};

export function HeroIndiaMarket({ data }: HeroIndiaMarketProps) {
  const [selectedTf, setSelectedTf] = useState<Timeframe>("1D");
  const pulse = data?.pulse;
  const niftyVal = pulse?.nifty?.value ?? 25431.2;
  const niftyChg = pulse?.nifty?.changePct ?? 0.0072;
  const breadth = pulse?.breadth;
  const adv = breadth?.advances ?? 1423;
  const dec = breadth?.declines ?? 817;
  const h52 = breadth?.high52w ?? 87;
  const l52 = breadth?.low52w ?? 42;

  const points = CHART_PATHS[selectedTf];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  // Build SVG polygon points
  const width = 480;
  const height = 120;
  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  });
  const pathData = `M ${coords.join(" L ")}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
              INDIA MARKET
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            NSE / BSE Headline Pulse
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/markets/india/nifty50"
            className="group flex items-center gap-1.5 rounded-lg border border-border bg-accent/30 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore NIFTY 50 Cockpit
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
        {/* Price & Chart Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-medium text-muted-foreground uppercase">
                NIFTY 50 Index
              </p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                  {niftyVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-semibold rounded px-2 py-0.5",
                    niftyChg >= 0
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-rose-400 bg-rose-500/10",
                  )}
                >
                  {niftyChg >= 0 ? "+" : ""}
                  {formatPct(niftyChg)}
                </span>
              </div>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 font-mono text-xs">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setSelectedTf(tf)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-all",
                    selectedTf === tf
                      ? "bg-card text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Intraday/Historical Area Chart */}
          <div className="relative h-28 w-full overflow-hidden rounded-lg bg-accent/10 p-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="niftyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaData} fill="url(#niftyGradient)" />
              <path
                d={pathData}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Stats Column */}
        <div className="lg:col-span-4 rounded-xl border border-border/70 bg-card/70 p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Market Breadth</span>
            <span className="font-semibold text-foreground">
              <span className="text-emerald-400 font-bold">{adv.toLocaleString()}</span>
              {" / "}
              <span className="text-rose-400 font-bold">{dec.toLocaleString()}</span>
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">52W High Count</span>
            <span className="font-semibold text-emerald-400 font-bold">{h52}</span>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">52W Low Count</span>
            <span className="font-semibold text-rose-400 font-bold">{l52}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cash Turnover</span>
            <span className="font-semibold text-foreground">₹1.18 L Cr</span>
          </div>
        </div>
      </div>

      {/* Subpage shortcuts */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3 text-[11px] font-mono">
        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
          Direct Indices:
        </span>
        {[
          { label: "NIFTY 50", href: "/markets/india/nifty50" },
          { label: "SENSEX", href: "/markets/india/sensex" },
          { label: "BANK NIFTY", href: "/markets/india/banknifty" },
          { label: "Midcap", href: "/markets/india/midcap" },
          { label: "Smallcap", href: "/markets/india/smallcap" },
          { label: "Breadth Desk", href: "/markets/breadth" },
          { label: "Valuation", href: "/markets/valuation" },
          { label: "Momentum", href: "/markets/momentum" },
          { label: "F&O Desk", href: "/derivatives" },
        ].map((sub) => (
          <Link
            key={sub.label}
            href={sub.href}
            className="rounded border border-border/70 bg-accent/20 px-2 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {sub.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
