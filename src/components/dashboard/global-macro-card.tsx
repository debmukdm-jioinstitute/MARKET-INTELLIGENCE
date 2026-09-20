"use client";

import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";

export function GlobalMacroCard({ data }: { data?: IndiaDashboardPayload | null }) {
  const radar = data?.globalRadar;

  const indices = [
    { name: "S&P 500", chg: radar?.["^GSPC"]?.changePct ?? 0.0041 },
    { name: "NASDAQ 100", chg: radar?.["^IXIC"]?.changePct ?? 0.0072 },
    { name: "DOW JONES", chg: radar?.["^DJI"]?.changePct ?? 0.0018 },
  ];

  const rates = [
    { name: "US 10Y Benchmark", val: `${(radar?.["^TNX"]?.value ?? 4.12).toFixed(2)}%` },
    { name: "US 2Y Yield", val: "3.74%" },
    { name: "Dollar Index (DXY)", val: (radar?.["DX-Y.NYB"]?.value ?? 101.4).toFixed(1) },
    { name: "CBOE VIX Volatility", val: (radar?.["^VIX"]?.value ?? 14.8).toFixed(1) },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Globe className="size-3.5" />
              GLOBAL MACRO
            </span>
          </div>
          <Link
            href="/macro/global"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Explore Global
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-3 font-mono text-xs">
          {/* US Equities */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              DEVELOPED MARKET EQUITIES
            </span>
            {indices.map((idx) => {
              const isPos = idx.chg >= 0;
              return (
                <div
                  key={idx.name}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-2"
                >
                  <span className="font-semibold text-foreground">{idx.name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-bold",
                      isPos ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10",
                    )}
                  >
                    {isPos ? "+" : ""}
                    {formatPct(idx.chg)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rates & Dollar */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              GLOBAL RATES & CURRENCY
            </span>
            {rates.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card/40 px-3 py-1.5"
              >
                <span className="text-muted-foreground text-[11px]">{r.name}</span>
                <span className="font-bold text-foreground">{r.val}</span>
              </div>
            ))}
          </div>

          {/* India Cross-Market Impact */}
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-[11px]">
            <span className="text-primary font-bold block text-[10px] uppercase">
              INDIA ↔ GLOBAL CORRELATION
            </span>
            <p className="text-muted-foreground mt-0.5 font-sans leading-relaxed">
              Weak Dollar (DXY &lt; 102) and sub-15 VIX continue to favor emerging market and Indian equity fund flows.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        {[
          { label: "US Markets", href: "/macro/global" },
          { label: "Global Yields", href: "/macro/global" },
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
