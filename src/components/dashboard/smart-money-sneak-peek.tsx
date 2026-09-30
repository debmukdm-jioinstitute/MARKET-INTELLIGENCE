"use client";

import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";

// Smart-money radar is unavailable: mutual-fund accumulation and promoter
// activity were previously rendered from hardcoded figures that were not real
// disclosure data. No verified feed is ingested yet.
export function SmartMoneySneakPeek() {
  return (
    <div className="bento-card-shell bento-card-stack rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Users className="size-4" />
        </span>
        <div>
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Smart Money & Ownership Radar
          </p>
          <h2 className="text-sm sm:text-lg font-bold text-foreground">
            Institutional Flow Intelligence
          </h2>
        </div>
      </div>

      <div className="space-y-3 pt-3">
        <p className="text-sm text-muted-foreground">
          Mutual-fund accumulation and promoter-activity tracking are temporarily
          unavailable — these panels previously showed figures that were not sourced
          from real disclosures, so they were removed. We are working on ingesting
          verified AMC portfolio disclosures and exchange filings.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/funds"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline touch-manipulation"
          >
            Open Mutual Fund Directory (live AMFI NAVs) <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
