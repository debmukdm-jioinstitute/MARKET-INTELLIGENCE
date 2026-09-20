"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortfolioRiskCard() {
  const sectors = [
    { name: "Financials", pct: 27, color: "bg-blue-500" },
    { name: "Technology", pct: 21, color: "bg-emerald-500" },
    { name: "Energy", pct: 14, color: "bg-amber-500" },
    { name: "Automobile", pct: 11, color: "bg-purple-500" },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <ShieldAlert className="size-3.5" />
              PORTFOLIO RISK
            </span>
          </div>
          <Link
            href="/risk"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Analyze Risk
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Sector Concentration Bars */}
        <div className="mt-5 space-y-3">
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            SECTOR CONCENTRATION
          </span>
          <div className="space-y-2.5">
            {sectors.map((s) => (
              <div key={s.name} className="space-y-1 font-mono text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-foreground font-medium">{s.name}</span>
                  <span className="font-bold text-muted-foreground">{s.pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-accent/40 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", s.color)}
                    style={{ width: `${s.pct * 2}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Metrics grid */}
          <div className="mt-4 rounded-xl border border-border/70 bg-card/40 p-3.5 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Top 5 Holdings Weight</span>
              <span className="font-bold text-foreground">48%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Portfolio Beta</span>
              <span className="font-bold text-foreground">0.91</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Annualized Volatility</span>
              <span className="font-bold text-foreground">14.2%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Max Drawdown</span>
              <span className="font-bold text-rose-400">-8.4%</span>
            </div>
          </div>

          {/* Warning badge */}
          <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <AlertTriangle className="size-3.5" />
              <span>Hidden Exposure:</span>
            </div>
            <span className="rounded bg-amber-400/20 px-2 py-0.5 font-bold text-amber-300">
              HIGH (RATE SENSITIVITY)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        {[
          { label: "VaR Desk", href: "/risk" },
          { label: "Stress Testing", href: "/scenarios" },
          { label: "Beta & Factor", href: "/quant" },
          { label: "Liquidity Risk", href: "/risk" },
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
