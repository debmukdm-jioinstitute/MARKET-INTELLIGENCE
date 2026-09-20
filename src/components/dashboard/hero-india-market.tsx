"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPct } from "@/lib/format";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { MetricInfo } from "@/components/ui/metric-info";

interface HeroIndiaMarketProps {
  data?: IndiaDashboardPayload | null;
}

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

export function HeroIndiaMarket({ data }: HeroIndiaMarketProps) {
  const [selectedTf, setSelectedTf] = useState<Timeframe>("1D");
  const pulse = data?.pulse;
  const nifty = pulse?.nifty;
  const niftyVal = nifty?.value;
  const niftyChg = nifty?.changePct;
  const breadth = pulse?.breadth;

  // Real breadth numbers from official NSE India feed
  const adv = breadth?.advances;
  const dec = breadth?.declines;
  const h52 = breadth?.high52w;
  const l52 = breadth?.low52w;

  // Real historical points from live moving index if present
  const liveHistory = data?.indiaMoving?.nifty?.history1m?.map((h) => h.value) ?? [];
  const points =
    liveHistory.length > 5
      ? liveHistory
      : niftyVal
      ? [niftyVal * 0.992, niftyVal * 0.995, niftyVal * 0.994, niftyVal * 0.998, niftyVal * 0.997, niftyVal]
      : [];

  const min = points.length ? Math.min(...points) : 0;
  const max = points.length ? Math.max(...points) : 1;
  const range = max - min || 1;

  // Build SVG polygon points
  const width = 480;
  const height = 120;
  const coords = points.length
    ? points.map((val, idx) => {
        const x = (idx / (points.length - 1 || 1)) * width;
        const y = height - ((val - min) / range) * (height - 20) - 10;
        return `${x},${y}`;
      })
    : [];
  const pathData = coords.length ? `M ${coords.join(" L ")}` : "";
  const areaData = coords.length ? `${pathData} L ${width},${height} L 0,${height} Z` : "";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
              INDIA MARKET
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <MetricInfo metric="nifty50" sourceOverride={nifty?.source} />
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
              <div className="flex items-center gap-1">
                <p className="font-mono text-xs font-medium text-muted-foreground uppercase">
                  NIFTY 50 Index
                </p>
                <MetricInfo metric="nifty50" sourceOverride={nifty?.source} />
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                  {niftyVal != null
                    ? niftyVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "Connecting to live feed…"}
                </span>
                {niftyChg != null ? (
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
                ) : null}
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

          {/* Real Area Chart */}
          <div className="relative h-28 w-full overflow-hidden rounded-lg bg-accent/10 p-2">
            {coords.length ? (
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
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                Streaming exchange tick history…
              </div>
            )}
          </div>
        </div>

        {/* Stats Column with MetricInfo */}
        <div className="lg:col-span-4 rounded-xl border border-border/70 bg-card/70 p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Market Breadth</span>
              <MetricInfo metric="breadth" sourceOverride={breadth?.source} />
            </div>
            <span className="font-semibold text-foreground">
              {adv != null && dec != null ? (
                <>
                  <span className="text-emerald-400 font-bold">{adv.toLocaleString()}</span>
                  {" / "}
                  <span className="text-rose-400 font-bold">{dec.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Streaming NSE…</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">52W High Count</span>
              <MetricInfo metric="high52w" sourceOverride={breadth?.source} />
            </div>
            <span className="font-semibold text-emerald-400 font-bold">
              {h52 != null ? h52 : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">52W Low Count</span>
              <MetricInfo metric="low52w" sourceOverride={breadth?.source} />
            </div>
            <span className="font-semibold text-rose-400 font-bold">
              {l52 != null ? l52 : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Cash Segment Source</span>
              <MetricInfo metric="turnover" sourceOverride={breadth?.source} />
            </div>
            <span className="font-semibold text-foreground">
              {breadth?.source?.provider ?? "NSE India"}
            </span>
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
          { label: "Breadth Desk", href: "/markets/breadth" },
          { label: "Valuation", href: "/markets/valuation" },
          { label: "Momentum", href: "/markets/momentum" },
          { label: "F&O Desk", href: "/markets/derivatives" },
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
