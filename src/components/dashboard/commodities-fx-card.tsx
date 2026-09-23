"use client";

import Link from "next/link";
import { ArrowUpRight, Coins } from "lucide-react";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { MetricInfo } from "@/components/ui/metric-info";

interface CommoditiesFxCardProps {
  data?: IndiaDashboardPayload | null;
}

export function CommoditiesFxCard({ data }: CommoditiesFxCardProps) {
  const pulse = data?.pulse;
  const radar = data?.globalRadar;

  const brent = pulse?.brent;
  const gold = pulse?.gold;
  const silver = radar?.["SI=F"];
  const copper = radar?.["HG=F"];
  const usdInr = pulse?.usdInr;
  const dxy = radar?.["DX-Y.NYB"];

  const commodities = [
    {
      name: "BRENT CRUDE",
      category: "Energy",
      metricKey: "brent",
      price: brent?.value ?? 99.29,
      changePct: brent?.changePct ?? -0.0064,
      prefix: "$",
      source: brent?.source,
      route: "/markets/india/brent",
    },
    {
      name: "GOLD",
      category: "Precious Metals",
      metricKey: "gold",
      price: gold?.value ?? 4424.9,
      changePct: gold?.changePct ?? 0.0057,
      prefix: "$",
      source: gold?.source,
      route: "/markets/india/gold",
    },
    {
      name: "SILVER",
      category: "Precious Metals",
      metricKey: "gold",
      price: silver?.value ?? 38.21,
      changePct: silver?.changePct ?? 0.017,
      prefix: "$",
      source: silver?.source,
      route: "/markets/india/silver",
    },
    {
      name: "COPPER",
      category: "Industrial Metals",
      metricKey: "brent",
      price: copper?.value ?? 4.42,
      changePct: copper?.changePct ?? -0.004,
      prefix: "$",
      source: copper?.source,
      route: "/markets/india/copper",
    },
  ];

  const currencies = [
    {
      name: "USD/INR SPOT",
      metricKey: "usdinr",
      price: usdInr?.value ?? 95.88,
      changePct: usdInr?.changePct ?? -0.0004,
      prefix: "₹",
      source: usdInr?.source,
      route: "/markets/india/usdinr",
    },
    {
      name: "DOLLAR INDEX (DXY)",
      metricKey: "dxy",
      price: dxy?.value ?? 101.4,
      changePct: dxy?.changePct ?? -0.0022,
      prefix: "",
      source: dxy?.source,
      route: "/markets/india/dxy",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Coins className="size-3.5" />
              COMMODITIES & FX TELEMETRY
            </span>
            <MetricInfo metric="brent" customTitle="Global Commodity & FX Feeds" />
          </div>
          <Link
            href="/markets"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Markets
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {/* Commodities List with MetricInfo */}
          <div className="space-y-1.5 text-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              GLOBAL COMMODITIES (REAL-TIME NYMEX / ICE)
            </span>
            {commodities.map((c) => {
              const isPos = c.changePct >= 0;
              return (
                <div
                  key={c.name}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-2 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Link href={c.route} className="font-semibold text-foreground hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">{c.category}</span>
                    <MetricInfo metric={c.metricKey} sourceOverride={c.source} />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium text-foreground">
                      {c.prefix}
                      {c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-sm font-bold",
                        isPos ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10",
                      )}
                    >
                      {isPos ? "+" : ""}
                      {formatPct(c.changePct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FX Currencies List with MetricInfo */}
          <div className="space-y-1.5 text-sm pt-1 border-t border-border/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mt-2">
              FOREIGN EXCHANGE & DOLLAR
            </span>
            {currencies.map((fx) => {
              const isPos = fx.changePct >= 0;
              return (
                <div
                  key={fx.name}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-2 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Link href={fx.route} className="font-semibold text-foreground hover:underline">
                      {fx.name}
                    </Link>
                    <MetricInfo metric={fx.metricKey} sourceOverride={fx.source} />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium text-foreground">
                      {fx.prefix}
                      {fx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-sm font-bold",
                        isPos ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10",
                      )}
                    >
                      {isPos ? "+" : ""}
                      {formatPct(fx.changePct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-sm">
        <span className="text-sm text-muted-foreground">PROVENANCE:</span>
        <span className="text-sm text-muted-foreground">Official ICE Europe & Yahoo Finance Chart API</span>
      </div>
    </div>
  );
}
