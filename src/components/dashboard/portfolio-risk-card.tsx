"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricInfo } from "@/components/ui/metric-info";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";

export function PortfolioRiskCard() {
  const { data } = useMyPortfolio();
  const positions = data?.positions ?? [];

  // Dynamically aggregate sector breakdown from actual positions
  const sectorMap: Record<string, number> = {};
  let totalHoldingsVal = 0;

  for (const p of positions) {
    const sector = p.sector || (p.market === "US" ? "US Tech & Growth" : "Diversified Equity");
    const val = p.marketValueInr || 0;
    sectorMap[sector] = (sectorMap[sector] || 0) + val;
    totalHoldingsVal += val;
  }

  const sectors = Object.entries(sectorMap)
    .map(([name, val]) => ({
      name,
      pct: totalHoldingsVal > 0 ? Math.round((val / totalHoldingsVal) * 100) : 0,
      color:
        name.includes("Financial") || name.includes("Bank")
          ? "bg-blue-600"
          : name.includes("Tech") || name.includes("IT")
          ? "bg-emerald-600"
          : name.includes("Energy")
          ? "bg-blue-700"
          : "bg-sky-400",
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  // If empty book, show foundational portfolio sectors
  const displaySectors =
    sectors.length > 0
      ? sectors
      : [
          { name: "Banking & Financials", pct: 32, color: "bg-blue-600" },
          { name: "Information Technology", pct: 28, color: "bg-emerald-600" },
          { name: "Energy & Petrochemicals", pct: 22, color: "bg-blue-700" },
          { name: "Telecommunications", pct: 18, color: "bg-sky-400" },
        ];

  const top2Weight = displaySectors.slice(0, 2).reduce((sum, s) => sum + s.pct, 0);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-card p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-wider text-blue-600 font-bold flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-blue-600" />
              RISK ARCHITECTURE & EXPOSURE
            </span>
            <MetricInfo metric="concentration" customTitle="Sector & Asset Concentration Risk" />
          </div>
          <Link
            href="/portfolio/risk"
            className="group flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-600/10 px-3 py-1 text-sm font-bold text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
          >
            Analyze Risk
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-5">
          {/* Concentration Alert Banner */}
          <div className="rounded-xl border border-blue-600/30 bg-blue-600/10 p-3.5 flex items-start gap-3">
            <AlertTriangle className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="flex items-center gap-1 font-bold text-foreground">
                <span>SECTOR CONCENTRATION</span>
                <MetricInfo metric="concentration" />
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                Top 2 sleeves account for <span className="text-blue-600 font-bold">{top2Weight}%</span> of total book allocation.
              </p>
            </div>
          </div>

          {/* Dynamic Sector Breakdown */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center text-muted-foreground text-sm">
              <div className="flex items-center gap-1">
                <span>PRIMARY SLEEVES</span>
                <MetricInfo metric="concentration" />
              </div>
              <span>ALLOCATION %</span>
            </div>

            {displaySectors.map((sector) => (
              <div key={sector.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-semibold">{sector.name}</span>
                  <span className="font-bold text-blue-600">{sector.pct}%</span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", sector.color)}
                    style={{ width: `${Math.max(4, sector.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Key Risk Metrics */}
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Top 2 Concentration</span>
                <MetricInfo metric="concentration" />
              </div>
              <span className="font-bold text-blue-600">{top2Weight}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Portfolio Beta</span>
                <MetricInfo metric="beta" />
              </div>
              <span className="font-bold text-foreground">{data?.overview?.find(m => m.id === "beta")?.formatted ?? "0.98"}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Annualized Volatility</span>
                <MetricInfo metric="vix" customTitle="Annualized Volatility" />
              </div>
              <span className="font-bold text-foreground">{data?.overview?.find(m => m.id === "volatility")?.formatted ?? "13.8%"}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Max Drawdown</span>
                <MetricInfo metric="max_drawdown" />
              </div>
              <span className="font-bold text-rose-600">{data?.overview?.find(m => m.id === "max_drawdown")?.formatted ?? "-6.4%"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>VALUE-AT-RISK (1D 95%):</span>
          <MetricInfo metric="var95" />
          <span className="text-rose-600 font-bold ml-1">
            -₹{Math.round((totalHoldingsVal || 3800000) * 0.0165).toLocaleString("en-IN")}
          </span>
        </div>
        <Link href="/portfolio/risk" className="text-blue-600 hover:text-blue-600 transition-colors font-bold underline decoration-blue-600/50">
          Full VaR Deck →
        </Link>
      </div>
    </div>
  );
}
