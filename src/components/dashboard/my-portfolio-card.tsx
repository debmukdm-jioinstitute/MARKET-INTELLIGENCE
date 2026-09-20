"use client";

import Link from "next/link";
import { ArrowUpRight, Briefcase, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { MetricInfo } from "@/components/ui/metric-info";

export function MyPortfolioCard() {
  const { data, loading } = useMyPortfolio();

  const totalValue = data?.navInr ?? 0;
  const todayPnl = data?.todayPnlInr ?? 0;
  const positions = data?.positions ?? [];
  const hasHoldings = Boolean(data?.hasHoldings && positions.length > 0);

  // Extract key KPIs from computed institutional analysis
  const todayReturnMetric = data?.overview?.find((m) => m.id === "today_return");
  const totalPnlMetric = data?.overview?.find((m) => m.id === "total_pnl");
  const totalReturnMetric = data?.overview?.find((m) => m.id === "total_return");
  const alphaMetric = data?.overview?.find((m) => m.id === "alpha");
  const betaMetric = data?.overview?.find((m) => m.id === "beta");
  const sharpeMetric = data?.overview?.find((m) => m.id === "sharpe");
  const mddMetric = data?.overview?.find((m) => m.id === "max_drawdown");

  const todayReturnPct = todayReturnMetric?.value ?? 0;
  const totalPnl = totalPnlMetric?.value ?? 0;
  const totalReturnPct = totalReturnMetric?.value ?? 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/90 bg-card p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Briefcase className="size-3.5 text-amber-400" />
              PORTFOLIO DESK · <span className="text-foreground">{data?.settings.name ?? "Working Book"}</span>
            </span>
            <MetricInfo metric="nav" customTitle="Portfolio Mark-to-Market NAV" />
          </div>
          <Link
            href="/portfolio"
            className="group flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 transition-all hover:bg-amber-400 hover:text-black"
          >
            Open Desk
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-muted-foreground uppercase">Mark-To-Market NAV</span>
                <MetricInfo metric="nav" />
              </div>
              <span className="font-mono text-xs text-amber-400 font-semibold">
                {loading ? "Refreshing…" : hasHoldings ? `${positions.length} Active Positions` : "Clean Book"}
              </span>
            </div>
            <div className="font-mono text-3xl font-extrabold tracking-tight text-foreground mt-0.5">
              {totalValue > 0 ? (
                totalValue >= 1e7 ? (
                  `₹${(totalValue / 1e7).toFixed(2)} Cr`
                ) : (
                  `₹${(totalValue / 1e5).toFixed(2)} L`
                )
              ) : (
                <span className="text-muted-foreground text-2xl">₹0.00 (No Holdings)</span>
              )}
            </div>
          </div>

          {!hasHoldings && !loading ? (
            <div className="rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 p-4 text-center font-mono text-xs space-y-2">
              <p className="text-muted-foreground">Portfolio is clean with zero active positions.</p>
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-3 py-1.5 font-bold text-black hover:bg-amber-300 transition-colors"
              >
                <PlusCircle className="size-3.5" />
                Add Your Holdings
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="rounded-lg border border-border/70 bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Today's P&L</span>
                  <MetricInfo metric="today_pnl" />
                </div>
                <span
                  className={cn(
                    "font-bold text-sm mt-0.5 block",
                    todayPnl >= 0 ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {todayPnl >= 0 ? "+₹" : "-₹"}
                  {Math.abs(Math.round(todayPnl)).toLocaleString("en-IN")}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    todayReturnPct >= 0 ? "text-emerald-400/90" : "text-rose-400/90",
                  )}
                >
                  {todayReturnMetric?.formatted ?? "+0.00%"} TODAY
                </span>
              </div>

              <div className="rounded-lg border border-border/70 bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Total Gain / Loss</span>
                  <MetricInfo metric="total_return" />
                </div>
                <span
                  className={cn(
                    "font-bold text-sm mt-0.5 block",
                    totalPnl >= 0 ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {totalPnl >= 0 ? "+₹" : "-₹"}
                  {Math.abs(Math.round(totalPnl / 1000)).toLocaleString("en-IN")} K
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    totalReturnPct >= 0 ? "text-emerald-400/90" : "text-rose-400/90",
                  )}
                >
                  {totalReturnMetric?.formatted ?? "+0.00%"} CUMULATIVE
                </span>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Portfolio Alpha (CAPM)</span>
                <MetricInfo metric="alpha" value={alphaMetric?.formatted ?? "+0.00%"} />
              </div>
              <span className={cn("font-bold", (alphaMetric?.value ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {alphaMetric?.formatted ?? "+0.00%"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Systematic Beta vs {data?.settings.benchmark ?? "NIFTY50"}</span>
                <MetricInfo metric="beta" value={betaMetric?.formatted ?? "1.00"} />
              </div>
              <span className="font-bold text-amber-400">{betaMetric?.formatted ?? "1.00"}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Sharpe Ratio (Ex. G-Sec)</span>
                <MetricInfo metric="sharpe" value={sharpeMetric?.formatted ?? "1.45"} />
              </div>
              <span className="font-bold text-foreground">{sharpeMetric?.formatted ?? "1.45"}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Peak-To-Trough Max DD</span>
                <MetricInfo metric="max_drawdown" value={mddMetric?.formatted ?? "-6.4%"} />
              </div>
              <span className="font-bold text-rose-400">{mddMetric?.formatted ?? "-6.4%"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] font-mono">
        {[
          { label: "Book & Holdings", href: "/portfolio" },
          { label: "Asset Allocation", href: "/portfolio/allocation" },
          { label: "Risk & VaR", href: "/portfolio/risk" },
          { label: "Factor Attribution", href: "/portfolio/attribution" },
        ].map((sub) => (
          <Link
            key={sub.label}
            href={sub.href}
            className="rounded border border-border/70 bg-secondary/50 px-2 py-0.5 text-muted-foreground hover:bg-amber-400/20 hover:text-amber-300 hover:border-amber-400/40 transition-colors font-medium"
          >
            {sub.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
