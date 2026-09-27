"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, History, ExternalLink, ArrowUpRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricInfo } from "@/components/ui/metric-info";
import { useWhatChanged } from "@/hooks/use-what-changed";
import type { MarketShiftItem } from "@/lib/feeds/what-changed/types";

function formatUpdated(iso: string) {
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

export function WhatChangedModule() {
  const { data, error, isLoading, mutate, isValidating } = useWhatChanged();
  const [expandedId, setExpandedId] = useState<string | null>("item-1");

  const items: MarketShiftItem[] = data?.items ?? [];
  const updatedAt = data?.fetchedAt;

  return (
    <div className="bento-card-shell bg-gradient-to-b from-card to-card/60">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
              <History className="size-3.5" />
              WHAT CHANGED?
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-600">
              Since last visit
            </span>
            <MetricInfo metric="fii_flow" customTitle="Institutional Market Delta Engine" />
          </div>
          <h3 className="text-lg font-bold text-foreground mt-0.5">
            Key Institutional Market & Macro Shifts
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {updatedAt ? (
              <>
                Refreshes every 3 hours · Last updated {formatUpdated(updatedAt)} IST
                {data?.slot != null ? ` · cycle ${data.slot}` : null}
              </>
            ) : isLoading ? (
              "Loading live NSE, RBI, and market feeds…"
            ) : error ? (
              "Could not refresh — showing cached view when available."
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => mutate()}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            disabled={isValidating}
          >
            <RefreshCw className={cn("size-3.5", isValidating && "animate-spin")} />
            Refresh
          </button>
          <Link
            href="/intelligence"
            className="group flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View Full Intelligence Journal
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      <div className="mt-3 divide-y divide-border/60">
        {items.length === 0 && isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Building shift report…</p>
        ) : null}
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} className="py-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : item.id);
                  }
                }}
                aria-expanded={isExpanded}
                className="flex w-full cursor-pointer items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <span className="text-sm font-bold text-muted-foreground/80 w-6 shrink-0">
                    {item.num}
                  </span>
                  <span className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.headline}
                  </span>
                  <MetricInfo metric={item.metricKey} />
                  <span
                    className={cn(
                      "hidden sm:inline-block rounded border px-2 py-0.5 text-sm font-bold tracking-wider",
                      item.tagColor,
                    )}
                  >
                    {item.tag}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    {isExpanded ? "Collapse" : "Inspect Data & Chart"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-4 rounded-xl border border-border/80 bg-accent/20 p-4 space-y-4 text-sm animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm uppercase font-bold text-primary block">
                        QUANTITATIVE OBSERVATION
                      </span>
                      <MetricInfo metric={item.metricKey} />
                    </div>
                    <p className="font-sans text-sm text-foreground leading-relaxed">
                      {item.dataSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-sm uppercase font-bold">
                        REGULATORY SOURCE
                      </span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 mt-0.5 font-bold"
                      >
                        {item.sourceName} <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-sm uppercase font-bold">
                        METHODOLOGY
                      </span>
                      <span className="text-muted-foreground mt-0.5 block font-sans">
                        {item.methodology}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40">
                    <span className="text-muted-foreground block text-sm uppercase font-bold mb-1.5">
                      DIRECTLY SENSITIVE SECURITIES
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.relatedSecurities.map((sec) => {
                        const hrefSymbol = sec.symbol.replace(/\s/g, "%20");
                        const isEquity = /^[A-Z]+$/.test(sec.symbol);
                        const href = isEquity ? `/markets/india/${hrefSymbol}` : `/research/${hrefSymbol}`;
                        return (
                          <Link
                            href={href}
                            key={`${item.id}-${sec.symbol}`}
                            className="group flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-sm hover:bg-accent hover:border-accent-foreground/30 transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-foreground group-hover:text-blue-600 transition-colors">
                              {sec.symbol}
                            </span>
                            <span className="text-muted-foreground font-sans text-sm">{sec.impact}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
