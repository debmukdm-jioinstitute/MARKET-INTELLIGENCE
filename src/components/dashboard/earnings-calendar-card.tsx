"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { EditableCopy } from "@/components/site/editable-copy";
import { MetricInfo } from "@/components/ui/metric-info";
import { cn } from "@/lib/utils";
import type { EarningsCalendarItem, EarningsCalendarPeriod } from "@/lib/feeds/earnings/build-calendar";

type Panel = {
  asOf: string;
  items: EarningsCalendarItem[];
  source: string;
  priorQuarterNote: string;
  failed?: number;
};

async function loadPanel(): Promise<Panel> {
  const res = await fetch("/api/feeds/earnings-calendar", { cache: "no-store" });
  if (!res.ok) throw new Error(`earnings-calendar ${res.status}`);
  return res.json();
}

function fmtAsOf(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

export function EarningsCalendarCard() {
  const { data, error, isLoading, mutate, isValidating } = useSWR("earnings-calendar-v1", loadPanel, {
    refreshInterval: 6 * 60 * 60 * 1000,
    revalidateOnFocus: true,
  });

  const periods: EarningsCalendarPeriod[] = ["TODAY", "TOMORROW", "THIS WEEK"];
  const items = data?.items ?? [];

  return (
    <div className="bento-card-shell bg-gradient-to-b from-card to-card/60">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              <EditableCopy id="card.earnings.kicker" label="Earnings kicker">
                EARNINGS DISCLOSURES & CALENDAR
              </EditableCopy>
            </span>
            <MetricInfo metric="earnings_results" customTitle="Quarterly Financial Results & EPS" />
          </div>
          <EditableCopy
            id="card.earnings.title"
            as="h3"
            label="Earnings title"
            className="text-base font-bold text-foreground mt-0.5"
          >
            Upcoming results dates (large caps)
          </EditableCopy>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.asOf
              ? `Yahoo calendar · refreshed ${fmtAsOf(data.asOf)} IST · ${data.priorQuarterNote}`
              : isLoading
                ? "Loading earnings dates…"
                : error
                  ? "Could not refresh calendar."
                  : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => mutate()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            disabled={isValidating}
          >
            <RefreshCw className={cn("size-3.5", isValidating && "animate-spin")} />
            Refresh
          </button>
          <Link
            href="/research"
            className="group flex items-center gap-1 rounded-lg border border-border bg-accent/30 px-3 py-1 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50"
          >
            View Research Desk
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {items.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No earnings in the next 14 days for tracked Nifty names — check{" "}
            <Link href="/research" className="text-primary underline">
              research desk
            </Link>
            .
          </p>
        ) : null}

        {periods.map((p) => {
          const bucket = items.filter((e) => e.period === p);
          if (bucket.length === 0) return null;
          return (
            <div key={p} className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-muted-foreground uppercase border-b border-border/40 pb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{p}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bucket.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/70 bg-card/50 p-3.5 space-y-2 hover:border-border transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="font-bold text-foreground text-sm">{item.symbol}</span>
                        <span className="rounded bg-accent/60 px-1.5 py-0.5 text-sm text-muted-foreground tabular-nums">
                          {item.date}
                        </span>
                        <span className="rounded bg-accent/60 px-1.5 py-0.5 text-sm text-muted-foreground">
                          {item.timing}
                        </span>
                        <MetricInfo
                          metric="earnings_results"
                          customTitle={`${item.company} Financial Results`}
                          sourceOverride={{
                            provider: data?.source ?? "Yahoo Finance",
                            url: item.sourceUrl,
                          }}
                        />
                      </div>
                      {item.portfolioWeight ? (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-sm font-bold text-emerald-600 shrink-0">
                          Weight: {item.portfolioWeight}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-1 border-t border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-sm">Last Rev:</span>
                        <span className="font-semibold text-foreground">{item.lastRevenue ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-sm">Last EPS:</span>
                        <span className="font-semibold text-foreground">{item.eps ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-sm">Surprise:</span>
                        <span
                          className={cn(
                            "font-semibold",
                            item.previousSurprise?.startsWith("-")
                              ? "text-rose-600"
                              : item.previousSurprise
                                ? "text-emerald-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {item.previousSurprise ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-sm">Note:</span>
                        <span className="font-semibold text-foreground truncate block">{item.expectedResult}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
