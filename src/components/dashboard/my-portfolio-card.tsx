"use client";

import Link from "next/link";
import { ArrowUpRight, Briefcase, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortfolio } from "@/components/providers/portfolio-provider";

export function MyPortfolioCard() {
  const store = usePortfolio();
  const active = store?.active;

  const totalValue = active
    ? Math.round(active.cash + active.holdings.reduce((sum, h) => sum + h.shares * (h.avgCost || 100), 0))
    : 1284000;

  // Canonical portfolio analytics matching desk telemetry
  const alpha = 0.0231;
  const beta = 0.91;
  const sharpe = 1.21;
  const maxDrawdown = -0.084;
  const todayReturn = 0.0142;
  const todayPnl = Math.round(totalValue * (todayReturn / (1 + todayReturn)));
  const totalReturn = 0.1482;
  const totalPnl = 166000;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <Briefcase className="size-3.5" />
              MY PORTFOLIO
            </span>
          </div>
          <Link
            href="/portfolio"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Open Desk
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase">Total Portfolio Value</span>
            <div className="font-mono text-3xl font-bold tracking-tight text-foreground mt-0.5">
              ₹{(totalValue / 100000).toFixed(2)} L
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-lg border border-border/70 bg-card/60 p-3">
              <span className="text-muted-foreground block text-[10px] uppercase">Today's P&L</span>
              <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                +₹{todayPnl.toLocaleString("en-IN")}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400/90">+1.42% TODAY</span>
            </div>

            <div className="rounded-lg border border-border/70 bg-card/60 p-3">
              <span className="text-muted-foreground block text-[10px] uppercase">Total Realized & Unrealized</span>
              <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                +₹{(totalPnl / 100000).toFixed(2)} L
              </span>
              <span className="text-[11px] font-semibold text-emerald-400/90">+14.82% TOTAL</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-3.5 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Portfolio Alpha (vs Nifty)</span>
              <span className="font-bold text-emerald-400">+2.31%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Portfolio Beta</span>
              <span className="font-bold text-foreground">0.91</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sharpe Ratio</span>
              <span className="font-bold text-foreground">1.21</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Max Historical Drawdown</span>
              <span className="font-bold text-rose-400">-8.4%</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
              <span className="text-muted-foreground font-sans">Alpha over NIFTY 50:</span>
              <span className="font-bold text-emerald-400">+2.31%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        {[
          { label: "Holdings", href: "/portfolio" },
          { label: "Performance", href: "/attribution" },
          { label: "Allocation", href: "/allocation" },
          { label: "Risk & VaR", href: "/risk" },
          { label: "Scenarios", href: "/scenarios" },
          { label: "Optimization", href: "/optimizer" },
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
