"use client";

import Link from "next/link";
import { ArrowUpRight, Briefcase, Lock, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { EditableCopy } from "@/components/site/editable-copy";
import { MetricInfo } from "@/components/ui/metric-info";
import { useAuth } from "@/components/providers/auth-provider";

export function MyPortfolioCard() {
  const { data, loading, locked } = useMyPortfolio();
  const { ready, isGuest } = useAuth();

  const totalValue = locked ? 0 : (data?.navInr ?? 0);
  const todayPnl = locked ? 0 : (data?.todayPnlInr ?? 0);
  const positions = data?.positions ?? [];
  const hasHoldings = !locked && Boolean(data?.hasHoldings && positions.length > 0);
  // Nothing to show → cover the numbers with a lock (guests: log in; members: add/import).
  const showLock = ready && (isGuest || (!loading && !hasHoldings));

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
    <div className="bento-card-shell bento-card-stack bg-card">
      <div>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <span className="text-sm uppercase tracking-wider text-blue-600 font-bold flex items-center gap-1.5">
            <Briefcase className="size-3.5 text-blue-600" aria-hidden />
            <EditableCopy id="card.portfolio.kicker" label="Portfolio kicker">
              PORTFOLIO DESK
            </EditableCopy>
          </span>
          <Link
            href="/portfolio"
            className="group flex items-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-600/10 px-3 py-1 text-sm font-bold text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
          >
            <EditableCopy id="card.portfolio.cta" label="Portfolio CTA">
              Open your Portfolio
            </EditableCopy>
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="relative mt-3 space-y-3">
          {showLock ? (
            <div
              role="status"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-card/80 px-5 text-center backdrop-blur-[3px]"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                <Lock className="size-6" />
              </span>
              <p className="text-sm font-semibold text-foreground">
                {isGuest
                  ? "Log in or create a new account to create or import your holdings and track them."
                  : "No holdings yet. Add or import your holdings to start tracking."}
              </p>
              {isGuest ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link href="/login?next=/Home" className="inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                    Log in
                  </Link>
                  <Link href="/signup" className="inline-flex min-h-10 items-center rounded-lg border border-blue-600/40 bg-blue-600/10 px-4 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-600 hover:text-white">
                    Create account
                  </Link>
                </div>
              ) : (
                <Link href="/portfolio" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                  <PlusCircle className="size-4" />
                  Add or import holdings
                </Link>
              )}
            </div>
          ) : null}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground uppercase">Mark-To-Market NAV</span>
                <MetricInfo metric="nav" />
              </div>
              <span className="text-sm text-blue-600 font-semibold">
                {loading && !isGuest ? "Refreshing…" : hasHoldings ? `${positions.length} Active Positions` : "0 Positions"}
              </span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-foreground mt-0.5">
              {totalValue > 0 ? (
                totalValue >= 1e7 ? (
                  `₹${(totalValue / 1e7).toFixed(2)} Cr`
                ) : (
                  `₹${(totalValue / 1e5).toFixed(2)} L`
                )
              ) : (
                <span className="text-muted-foreground">₹0</span>
              )}
            </div>
          </div>

          {(

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm uppercase font-semibold">Today's P&L</span>
                  <MetricInfo metric="today_pnl" />
                </div>
                <span
                  className={cn(
                    "font-bold text-sm mt-0.5 block",
                    todayPnl >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {todayPnl >= 0 ? "+₹" : "-₹"}
                  {Math.abs(Math.round(todayPnl)).toLocaleString("en-IN")}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    todayReturnPct >= 0 ? "text-emerald-600/90" : "text-rose-600/90",
                  )}
                >
                  {todayReturnMetric?.formatted ?? "+0.00%"} TODAY
                </span>
              </div>

              <div className="rounded-lg border border-border/70 bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm uppercase font-semibold">Total Gain / Loss</span>
                  <MetricInfo metric="total_return" />
                </div>
                <span
                  className={cn(
                    "font-bold text-sm mt-0.5 block",
                    totalPnl >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {totalPnl >= 0 ? "+₹" : "-₹"}
                  {Math.abs(Math.round(totalPnl / 1000)).toLocaleString("en-IN")} K
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    totalReturnPct >= 0 ? "text-emerald-600/90" : "text-rose-600/90",
                  )}
                >
                  {totalReturnMetric?.formatted ?? "+0.00%"} CUMULATIVE
                </span>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Portfolio Alpha (CAPM)</span>
                <MetricInfo metric="alpha" value={hasHoldings ? (alphaMetric?.formatted ?? "+0.00%") : "0.00%"} />
              </div>
              <span className={cn("font-bold", (hasHoldings ? (alphaMetric?.value ?? 0) : 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {hasHoldings ? (alphaMetric?.formatted ?? "+0.00%") : "0.00%"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Systematic Beta vs {data?.settings.benchmark ?? "NIFTY50"}</span>
                <MetricInfo metric="beta" value={hasHoldings ? (betaMetric?.formatted ?? "1.00") : "0.00"} />
              </div>
              <span className="font-bold text-blue-600">{hasHoldings ? (betaMetric?.formatted ?? "1.00") : "0.00"}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Sharpe Ratio (Ex. G-Sec)</span>
                <MetricInfo metric="sharpe" value={hasHoldings ? (sharpeMetric?.formatted ?? "1.45") : "0.00"} />
              </div>
              <span className="font-bold text-foreground">{hasHoldings ? (sharpeMetric?.formatted ?? "1.45") : "0.00"}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Peak-To-Trough Max DD</span>
                <MetricInfo metric="max_drawdown" value={hasHoldings ? (mddMetric?.formatted ?? "-6.4%") : "0.0%"} />
              </div>
              <span className="font-bold text-rose-600">{hasHoldings ? (mddMetric?.formatted ?? "-6.4%") : "0.0%"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2 text-sm">
        {[
          { label: "Book & Holdings", href: "/portfolio" },
          { label: "Asset Allocation", href: "/portfolio/allocation" },
          { label: "Risk & VaR", href: "/portfolio/risk" },
          { label: "Factor Attribution", href: "/portfolio/attribution" },
        ].map((sub) => (
          <Link
            key={sub.label}
            href={sub.href}
            className="rounded border border-border/70 bg-secondary/50 px-2 py-0.5 text-muted-foreground hover:bg-blue-600/20 hover:text-blue-600 hover:border-blue-600/40 transition-colors font-medium"
          >
            {sub.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
