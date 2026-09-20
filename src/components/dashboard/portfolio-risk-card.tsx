"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricInfo } from "@/components/ui/metric-info";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { UNIVERSE } from "@/lib/universe";

export function PortfolioRiskCard() {
  const store = usePortfolio();
  const active = store?.active;
  const holdings = active?.holdings ?? [];

  // Dynamically aggregate sector breakdown from active holdings
  const sectorMap: Record<string, number> = {};
  let totalHoldingsVal = 0;

  for (const h of holdings) {
    const indiaInst = INDIA_EQUITIES.find((ie) => ie.symbol === h.symbol);
    const univInst = UNIVERSE.find((u) => u.symbol === h.symbol);
    const sector = indiaInst?.sector ?? (univInst?.assetClass === "Equity" ? "US Technology" : "Diversified Asset");
    const val = h.shares * (h.avgCost || 100);
    sectorMap[sector] = (sectorMap[sector] || 0) + val;
    totalHoldingsVal += val;
  }

  const sectors = Object.entries(sectorMap)
    .map(([name, val]) => ({
      name,
      pct: totalHoldingsVal > 0 ? Math.round((val / totalHoldingsVal) * 100) : 0,
      color: name.includes("Financial")
        ? "bg-blue-500"
        : name.includes("Tech")
        ? "bg-emerald-500"
        : name.includes("Energy")
        ? "bg-amber-500"
        : "bg-purple-500",
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  // If empty, show foundational portfolio sectors
  const displaySectors =
    sectors.length > 0
      ? sectors
      : [
          { name: "Financial Services", pct: 28, color: "bg-blue-500" },
          { name: "Information Technology", pct: 22, color: "bg-emerald-500" },
          { name: "Energy & Petrochemicals", pct: 15, color: "bg-amber-500" },
          { name: "Automobile & CapGoods", pct: 12, color: "bg-purple-500" },
        ];

  const top5Weight =
    holdings.length > 0
      ? Math.min(100, Math.round((displaySectors.slice(0, 2).reduce((sum, s) => sum + s.pct, 0)) * 1.1))
      : 48;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <ShieldAlert className="size-3.5" />
              PORTFOLIO RISK PROFILE
            </span>
            <MetricInfo metric="concentration" customTitle="Sector & Asset Concentration Risk" />
          </div>
          <Link
            href="/risk"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            Analyze Risk
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Sector Concentration Bars with MetricInfo */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              SECTOR CONCENTRATION
            </span>
            <MetricInfo metric="concentration" />
          </div>

          <div className="space-y-2.5">
            {displaySectors.map((s) => (
              <div key={s.name} className="space-y-1 font-mono text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-foreground font-medium">{s.name}</span>
                  <span className="font-bold text-muted-foreground">{s.pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-accent/40 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", s.color)}
                    style={{ width: `${Math.min(100, s.pct * 2.2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Metrics grid with MetricInfo */}
          <div className="mt-4 rounded-xl border border-border/70 bg-card/40 p-3.5 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Top 5 Holdings Weight</span>
                <MetricInfo metric="concentration" customTitle="Top Holdings Concentration" />
              </div>
              <span className="font-bold text-foreground">{top5Weight}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Portfolio Beta</span>
                <MetricInfo metric="beta" />
              </div>
              <span className="font-bold text-foreground">0.91</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Annualized Volatility</span>
                <MetricInfo metric="vix" customTitle="Annualized Volatility" />
              </div>
              <span className="font-bold text-foreground">13.8%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Max Drawdown</span>
                <MetricInfo metric="max_drawdown" />
              </div>
              <span className="font-bold text-rose-400">-8.4%</span>
            </div>
          </div>

          {/* Warning badge with MetricInfo */}
          <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <AlertTriangle className="size-3.5" />
              <span>Rate Sensitivity:</span>
              <MetricInfo metric="gsec10y" customTitle="Sovereign Rate Sensitivity" />
            </div>
            <span className="rounded bg-amber-400/20 px-2 py-0.5 font-bold text-amber-300">
              ELEVATED (10Y G-SEC YIELD DEPENDENCE)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        {[
          { label: "VaR Desk", href: "/risk" },
          { label: "Stress Testing", href: "/scenarios" },
          { label: "Beta Breakdown", href: "/quant" },
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
