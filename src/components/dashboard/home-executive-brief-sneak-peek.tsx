"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles, Compass, ShieldCheck, AlertCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import { buildSiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function HomeExecutiveBriefSneakPeek() {
  const brief = useMemo(() => buildSiteWideExecutiveBrief(), []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-card/90 to-primary/5 p-3.5 sm:p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Stance + Headline */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-primary tracking-wide">
              <Sparkles className="size-3.5" />
              EXECUTIVE BRIEF
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] sm:text-xs font-medium text-muted-foreground">
              {brief.displayDate} · {brief.marketSession.replace("_", " ")}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] sm:text-xs font-bold",
                brief.stance === "Bullish"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                  : brief.stance === "Defensive"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
              )}
            >
              <TrendingUp className="size-3" />
              Stance: {brief.stance} ({brief.stanceScore}/100)
            </span>
          </div>

          <h2 className="text-sm sm:text-lg font-bold text-foreground leading-snug">
            {brief.executiveHeadline}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 max-w-4xl">
            {brief.executiveSummary}
          </p>

          {/* Quick Pillars Tape */}
          <div className="pt-1 flex flex-wrap gap-1.5 sm:gap-2 text-xs">
            {brief.keyThemes.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/80 px-2 py-1 text-muted-foreground max-w-full"
              >
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground text-[11px] sm:text-xs shrink-0">{item.theme}:</span>
                <span className="truncate max-w-[170px] sm:max-w-[280px] text-[11px] sm:text-xs">{item.headline}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-end gap-2 border-t lg:border-t-0 lg:border-l border-border/60 pt-3 lg:pt-0 lg:pl-5">
          <Link
            href="/intelligence/brief"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-all touch-manipulation active:scale-[0.98]"
          >
            Read Intelligence Brief
            <ArrowUpRight className="size-4" />
          </Link>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground text-center sm:text-right lg:text-center">
            Cited from official NSE, BSE, RBI & AMFI filings
          </span>
        </div>
      </div>
    </div>
  );
}
