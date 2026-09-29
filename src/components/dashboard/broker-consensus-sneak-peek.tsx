"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingUp, BarChart3, Building, ShieldCheck } from "lucide-react";
import { getAllBrokerResearchReports, INSTITUTIONAL_BROKER_SOURCES } from "@/lib/broker-research/database";
import { cn } from "@/lib/utils";

export function BrokerConsensusSneakPeek() {
  const reports = useMemo(() => {
    return getAllBrokerResearchReports().slice(0, 4);
  }, []);

  return (
    <div className="bento-card-shell bento-card-stack rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Institutional Broker Consensus
            </p>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Research Notes & Target Price Revisions
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
            {INSTITUTIONAL_BROKER_SOURCES.length} Brokerage Houses Monitored
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {reports.map((rep) => {
          const isBuy = rep.rating === "BUY" || rep.rating === "ACCUMULATE";
          return (
            <div
              key={rep.id}
              className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {rep.symbol}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      isBuy
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {rep.rating}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                  {rep.broker}
                </h4>
                <p className="text-xs text-muted-foreground truncate">{rep.analyst}</p>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Target Price</span>
                  <span className="font-bold text-foreground tabular-nums">
                    ₹{rep.targetPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Implied Upside</span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      rep.upsidePct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {rep.upsidePct >= 0 ? "+" : ""}
                    {rep.upsidePct.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                  {rep.thesis}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          Covers Motilal Oswal, ICICI Sec, Kotak, JM Financial, Axis Sec, Emkay, Nuvama, PL, Yes Sec & IIFL.
        </span>
        <Link
          href="/research"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Open Institutional Broker Research Aggregator <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
