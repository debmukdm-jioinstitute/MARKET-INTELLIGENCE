"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldAlert, AlertTriangle, TrendingDown, TrendingUp, CheckCircle, ExternalLink } from "lucide-react";
import { getAllCreditActivities } from "@/lib/credit/database";
import { cn } from "@/lib/utils";

export function CreditDegradationSneakPeek() {
  const [filterMode, setFilterMode] = useState<"risk" | "upgrades">("risk");

  const activities = useMemo(() => getAllCreditActivities(), []);

  const riskActions = useMemo(() => {
    return activities.filter((a) =>
      ["RATING_DOWNGRADE", "CREDIT_WATCH", "LIQUIDITY_CONCERN", "DEFAULT"].includes(a.action)
    ).slice(0, 4);
  }, [activities]);

  const upgradeActions = useMemo(() => {
    return activities.filter((a) =>
      ["RATING_UPGRADE", "DEBT_RESTRUCTURING"].includes(a.action)
    ).slice(0, 4);
  }, [activities]);

  const displayList = filterMode === "risk" ? riskActions : upgradeActions;

  return (
    <div className="bento-card-shell bento-card-stack rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="size-4" />
          </span>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Credit Degradation & Solvency
            </p>
            <h2 className="text-sm sm:text-lg font-bold text-foreground">
              Rating Agency Actions Connected to Equity Prices
            </h2>
          </div>
        </div>

        {/* Toggle - scrollable on mobile */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-muted/60 p-1 text-xs font-medium max-w-full">
          <button
            type="button"
            onClick={() => setFilterMode("risk")}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all touch-manipulation",
              filterMode === "risk"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="size-3.5 text-rose-500" />
            Downgrades & Watch ({riskActions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("upgrades")}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all touch-manipulation",
              filterMode === "upgrades"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckCircle className="size-3.5 text-emerald-500" />
            Upgrades ({upgradeActions.length})
          </button>
        </div>
      </div>

      {/* Grid of actions */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {displayList.map((item) => {
          const isRisk = ["RATING_DOWNGRADE", "CREDIT_WATCH", "LIQUIDITY_CONCERN", "DEFAULT"].includes(item.action);
          return (
            <div
              key={item.id}
              className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {item.symbol}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold",
                      isRisk
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {item.agency} · {item.action.replace("_", " ")}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                  {item.companyName}
                </h4>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground line-through">{item.ratingBefore}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-bold text-foreground">{item.ratingAfter}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Rated Debt Exposure</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    ₹{item.ratedDebtAmountCr.toLocaleString("en-IN")} Cr
                  </span>
                </div>
                {item.equityConnection && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Equity Move Since Action</span>
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        item.equityConnection.equityReturnSinceActionPct >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {item.equityConnection.equityReturnSinceActionPct >= 0 ? "+" : ""}
                      {item.equityConnection.equityReturnSinceActionPct.toFixed(1)}%
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {item.equityConnection?.equityImpactAnalysis || item.agencyRationale}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          Crawls CRISIL, ICRA, CARE, India Ratings, Acuité, and Brickwork. Transmits credit shifts into valuation and cost of capital.
        </span>
        <Link
          href="/intelligence/credit"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline touch-manipulation"
        >
          Open Credit & Solvency Radar <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
