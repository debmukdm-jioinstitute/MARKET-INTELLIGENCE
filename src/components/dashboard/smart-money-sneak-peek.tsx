"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, PieChart, Users, ShieldAlert, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";
import { computeInstitutionalAccumulation } from "@/lib/funds/analytics";
import { getAllPromoterActivities } from "@/lib/promoters/database";
import { cn } from "@/lib/utils";

export function SmartMoneySneakPeek() {
  const [activeSubTab, setActiveSubTab] = useState<"mf" | "promoters">("mf");

  const accumulatedStocks = useMemo(() => {
    return computeInstitutionalAccumulation().slice(0, 4);
  }, []);

  const promoterActions = useMemo(() => {
    return getAllPromoterActivities().slice(0, 4);
  }, []);

  return (
    <div className="bento-card-shell bento-card-stack rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Users className="size-4" />
          </span>
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Smart Money & Ownership Radar
            </p>
            <h2 className="text-sm sm:text-lg font-bold text-foreground">
              Mutual Fund Accumulation & Promoter Activity
            </h2>
          </div>
        </div>

        {/* Sub-tab switcher - scrollable on mobile */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-muted/60 p-1 text-xs font-medium max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubTab("mf")}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all touch-manipulation",
              activeSubTab === "mf"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PieChart className="size-3.5 text-blue-500" />
            MF Accumulation
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("promoters")}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all touch-manipulation",
              activeSubTab === "promoters"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldAlert className="size-3.5 text-emerald-500" />
            Promoter Buying & Pledges
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === "mf" ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Which stocks are being accumulated across India&apos;s mutual funds?
            </span>
            <span>Monthly AMC Disclosures Sync</span>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {accumulatedStocks.map((item) => (
              <div
                key={item.symbol}
                className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {item.symbol}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="size-3" />
                      Accumulated
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                    {item.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">{item.sector}</p>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Net Value Bought</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +₹{item.netValueBoughtCr.toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Funds Accumulating</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {item.fundsBuyingCount} AMCs
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total MF Holdings</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      ₹{item.totalInstitutionalAumCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-xs text-muted-foreground">
              Analyzes multi-fund holdings, sector exposure, overlap, and institutional manager buying across India.
            </span>
            <Link
              href="/funds"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline touch-manipulation"
            >
              Open Mutual Fund X-Ray & Accumulation Radar <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Insider Disclosures, Controlling Stake Changes & Pledges
            </span>
            <span>SEBI PIT & SAST Regulatory Filings</span>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {promoterActions.map((act) => {
              const isBullish = act.riskImpact === "BULLISH_CONVICTION";
              return (
                <div
                  key={act.id}
                  className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {act.symbol}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          isBullish
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {act.category.replace("_", " ")}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                      {act.companyName}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">{act.personName}</p>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Transaction Value</span>
                      <span className="font-bold text-foreground tabular-nums">
                        ₹{act.transactionValueCr?.toFixed(1) ?? "—"} Cr
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Stake Change</span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          (act.stakePctChange ?? 0) >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {(act.stakePctChange ?? 0) >= 0 ? "+" : ""}
                        {act.stakePctChange?.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                      {act.rationale}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-xs text-muted-foreground">
              Pledges and insider transactions feed directly into the portfolio risk engine.
            </span>
            <Link
              href="/intelligence/promoters"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline touch-manipulation"
            >
              Open Promoter Activity Tracker & Block Deals <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
