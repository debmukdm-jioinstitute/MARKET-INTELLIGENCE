"use client";

import { fmtChgPts } from "@/lib/format-india";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { EditableCopy } from "@/components/site/editable-copy";
import { AccessibleLineChart } from "@/components/charts/accessible-line-chart";
import { SignedPct } from "@/components/ui/signed-value";
import { QuoteProvenance } from "@/components/ui/quote-provenance";
import { MetricInfo } from "@/components/ui/metric-info";
import { useCandles } from "@/hooks/use-candles";

interface HeroIndiaMarketProps {
  data?: IndiaDashboardPayload | null;
}

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "6M", "1Y"] as const;
const RANGE_LABEL: Record<string, string> = { "1D": "Today", "1W": "Last 7 days", "1M": "Last 1 month", "3M": "Last 3 months", "6M": "Last 6 months", "1Y": "Last 1 year" };
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

  const { candles, loading } = useCandles("NIFTY 50", selectedTf, true);

  return (
    <div className="bento-card-shell bento-card-stack bg-gradient-to-b from-card to-card/60">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <EditableCopy
              id="card.hero-india.title"
              as="h2"
              label="India market title"
              className="text-xl font-bold tracking-tight text-foreground"
            >
              NSE / BSE Headline Pulse
            </EditableCopy>
            <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <MetricInfo metric="nifty50" sourceOverride={nifty?.source} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/markets/india/nifty50"
            className="group flex items-center gap-1.5 rounded-lg border border-border bg-accent/30 px-3 py-1.5 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            <EditableCopy id="card.hero-india.cta" label="India market CTA">
              Explore NIFTY 50 Cockpit
            </EditableCopy>
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 items-center">
        {/* Price & Chart Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-muted-foreground uppercase">
                  NIFTY 50 Index
                </p>
                <MetricInfo metric="nifty50" sourceOverride={nifty?.source} />
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {niftyVal != null
                    ? niftyVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "Connecting to live feed…"}
                </span>
                {nifty?.change != null ? (
                  <span className={cn("text-sm font-semibold tabular-nums", nifty.change >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {fmtChgPts(nifty.change)}
                  </span>
                ) : null}
                {niftyChg != null ? (
                  <SignedPct value={niftyChg} label="today" className="rounded bg-muted/40 px-2 py-0.5 text-sm font-semibold" />
                ) : null}
              </div>
              <QuoteProvenance
                className="mt-1.5"
                exchange="NSE"
                symbol="NIFTY 50"
                currency="Index points"
                asOf={nifty?.source.asOf ?? data?.fetchedAt}
                nseSession
                provider={nifty?.source.provider}
                url={nifty?.source.url}
              />
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-sm">
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

          <AccessibleLineChart
            title="Index level · NIFTY 50"
            range={RANGE_LABEL[selectedTf]}
            frequency={selectedTf === "1D" ? "5-minute candles, close" : "Daily close"}
            unit="Index points"
            points={candles.map((c) => ({ ts: c.ts, value: c.close }))}
            intraday={selectedTf === "1D"}
            loading={loading}
            sourceStatus={`${nifty?.source.provider ?? "Upstox"} · candles`}
            filename={`nifty50-${selectedTf.toLowerCase()}`}
          />
        </div>

        {/* Stats Column with MetricInfo */}
        <div className="lg:col-span-4 rounded-xl border border-border/70 bg-card/70 p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Market Breadth</span>
              <MetricInfo metric="breadth" sourceOverride={breadth?.source} />
            </div>
            <span className="font-semibold text-foreground">
              {adv != null && dec != null ? (
                <>
                  <span className="text-emerald-600 font-bold">▲ {adv.toLocaleString()} advancing</span>
                  {" · "}
                  <span className="text-rose-600 font-bold">▼ {dec.toLocaleString()} declining</span>
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
            <span className="font-semibold text-emerald-600 font-bold">
              {h52 != null ? h52 : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">52W Low Count</span>
              <MetricInfo metric="low52w" sourceOverride={breadth?.source} />
            </div>
            <span className="font-semibold text-rose-600 font-bold">
              {l52 != null ? l52 : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Cash Segment Source</span>
              <MetricInfo metric="turnover" sourceOverride={breadth?.source} />
            </div>
            <span className="font-semibold text-foreground">
              {breadth?.source?.provider ?? "Upstox / NSE"}
            </span>
          </div>
        </div>
      </div>

      {/* Subpage shortcuts */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2 text-sm">
        <span className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
          Direct Indices:
        </span>
        {[
          { label: "NIFTY 50", href: "/markets/india/nifty50" },
          { label: "SENSEX", href: "/markets/india/sensex" },
          { label: "BANK NIFTY", href: "/markets/india/banknifty" },
          { label: "Breadth Desk", href: "/markets/breadth" },
          { label: "Valuation", href: "/markets/sectors?tab=valuation" },
          { label: "Momentum", href: "/markets/breadth#momentum" },
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
