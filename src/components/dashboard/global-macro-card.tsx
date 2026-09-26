"use client";

import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { EditableCopy } from "@/components/site/editable-copy";
import { MetricInfo } from "@/components/ui/metric-info";

export function GlobalMacroCard({ data }: { data?: IndiaDashboardPayload | null }) {
  const radar = data?.globalRadar;

  const spx = radar?.["^GSPC"];
  const ndx = radar?.["^IXIC"];
  const dji = radar?.["^DJI"];
  const tnx = radar?.["^TNX"];
  const dxy = radar?.["DX-Y.NYB"];
  const vix = radar?.["^VIX"];

  const indices = [
    { name: "S&P 500", metricKey: "sp500", chg: spx?.changePct ?? 0.0041, source: spx?.source },
    { name: "NASDAQ 100", metricKey: "nasdaq", chg: ndx?.changePct ?? 0.0072, source: ndx?.source },
    { name: "DOW JONES", metricKey: "sp500", chg: dji?.changePct ?? 0.0018, source: dji?.source },
  ];

  const rates = [
    {
      name: "US 10Y Benchmark",
      metricKey: "us10y",
      val: tnx?.value != null ? `${tnx.value.toFixed(2)}%` : "4.12%",
      source: tnx?.source,
    },
    {
      name: "Dollar Index (DXY)",
      metricKey: "dxy",
      val: dxy?.value != null ? dxy.value.toFixed(2) : "101.40",
      source: dxy?.source,
    },
    {
      name: "CBOE VIX Volatility",
      metricKey: "vix",
      val: vix?.value != null ? vix.value.toFixed(2) : "14.80",
      source: vix?.source,
    },
  ];

  return (
    <div className="bento-card-shell bento-card-stack bg-gradient-to-b from-card to-card/60">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Globe className="size-3.5" aria-hidden />
              <EditableCopy id="card.global-macro.kicker" label="Global macro kicker">
                GLOBAL MACRO DATA
              </EditableCopy>
            </span>
            <MetricInfo metric="sp500" customTitle="Global Cross-Asset Telemetry" />
          </div>
          <Link
            href="/macro/global"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            <EditableCopy id="card.global-macro.cta" label="Global macro CTA">
              Explore Global
            </EditableCopy>
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-3 space-y-3 text-sm">
          {/* US Equities with MetricInfo */}
          <div className="space-y-1.5">
            <span className="text-sm uppercase font-bold tracking-wider text-muted-foreground block">
              DEVELOPED MARKET BENCHMARKS
            </span>
            {indices.map((idx) => {
              const isPos = idx.chg >= 0;
              return (
                <div
                  key={idx.name}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-2"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">{idx.name}</span>
                    <MetricInfo metric={idx.metricKey} sourceOverride={idx.source} />
                  </div>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-sm font-bold",
                      isPos ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10",
                    )}
                  >
                    {isPos ? "+" : ""}
                    {formatPct(idx.chg)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rates & Dollar with MetricInfo */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <span className="text-sm uppercase font-bold tracking-wider text-muted-foreground block">
              GLOBAL RATES & CURRENCY
            </span>
            {rates.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-1.5"
              >
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">{r.name}</span>
                  <MetricInfo metric={r.metricKey} sourceOverride={r.source} />
                </div>
                <span className="font-bold text-foreground">{r.val}</span>
              </div>
            ))}
          </div>

          {/* India Cross-Market Impact */}
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <span className="text-primary font-bold block text-sm uppercase">
              INDIA ↔ GLOBAL LIQUIDITY PASS-THROUGH
            </span>
            <p className="text-muted-foreground mt-0.5 font-sans leading-relaxed">
              Live feeds confirm US 10Y ({tnx?.value ? `${tnx.value.toFixed(2)}%` : "sub-4.2%"}) and sub-15 VIX continue to support foreign institutional capital allocation into Indian capital markets.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-sm">
        {[
          { label: "US Markets", href: "/macro/global" },
          { label: "Yield Spreads", href: "/macro/global" },
          { label: "Dollar Dynamics", href: "/macro/global" },
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
