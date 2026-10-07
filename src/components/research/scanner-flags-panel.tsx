"use client";

import { Panel } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ScannerHit {
  scanner: string;
  label: string;
  bias: "positive" | "negative" | "watch";
  symbol: string;
  price?: number;
  changePct?: number;
  trigger?: string;
  summary?: string;
}

interface ScannerResponse {
  run?: {
    asOf: string;
    universe?: string;
    scanned?: number;
    failed?: number;
  } | null;
  symbolHits?: ScannerHit[];
  authenticated?: boolean;
}

type PanelState =
  | { status: "loading" }
  | { status: "ready"; hits: ScannerHit[]; run: ScannerResponse["run"]; isStale: boolean; authenticated: boolean }
  | { status: "empty"; run: ScannerResponse["run"]; isStale: boolean; authenticated: boolean }
  | { status: "unavailable"; message: string };

export function ScannerFlagsPanel({ symbol }: { symbol: string }) {
  const [state, setState] = useState<PanelState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    setState({ status: "loading" });

    async function load() {
      try {
        const res = await fetch(`/api/scanner?symbol=${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timer);
        if (!res.ok) {
          if (!cancelled) {
            setState({
              status: "unavailable",
              message: "Scanner telemetry is temporarily unavailable.",
            });
          }
          return;
        }
        const data = (await res.json()) as ScannerResponse;
        if (cancelled) return;

        const hits = data.symbolHits ?? [];
        const asOfTime = data.run?.asOf ? new Date(data.run.asOf).getTime() : 0;
        const isStale = asOfTime > 0 ? Date.now() - asOfTime > 24 * 3600 * 1000 : false;
        if (hits.length > 0) {
          setState({
            status: "ready",
            hits,
            run: data.run,
            isStale,
            authenticated: Boolean(data.authenticated),
          });
        } else {
          setState({
            status: "empty",
            run: data.run,
            isStale,
            authenticated: Boolean(data.authenticated),
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "unavailable",
            message: "Scanner query timed out.",
          });
        }
      }
    }

    if (symbol) load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [symbol]);

  if (state.status === "loading") {
    return (
      <Panel title="Market Radar & Scanner Signals" subtitle="Rule-based momentum, breakout, and reversal triggers">
        <div className="space-y-3 animate-pulse">
          <div className="h-14 rounded-lg bg-muted/30" />
          <div className="h-14 rounded-lg bg-muted/30" />
        </div>
      </Panel>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Panel title="Market Radar & Scanner Signals" subtitle="Rule-based momentum, breakout, and reversal triggers">
        <p className="text-sm text-muted-foreground">{state.message}</p>
      </Panel>
    );
  }

  const { run, authenticated, isStale } = state;
  const asOfDate = run?.asOf ? new Date(run.asOf) : null;

  return (
    <Panel
      title="Market Radar & Scanner Signals"
      subtitle="Active quantitative triggers and algorithmic radar filters flagging this security."
      action={
        <div className="flex items-center gap-2">
          {isStale ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-sm">
              Stale scan ({asOfDate?.toLocaleDateString()})
            </Badge>
          ) : asOfDate ? (
            <span className="text-sm text-muted-foreground">
              Scan run: {asOfDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
          <Link
            href="/intelligence/scanner"
            className="text-sm font-semibold text-primary hover:underline ml-2"
          >
            All scanners →
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {state.status === "empty" ? (
          <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
            <p className="text-sm text-foreground font-medium">No active scanner triggers</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {symbol} is not currently flagged by any of the 14 momentum, breakout, or reversal scanners in the latest universe scan ({run?.scanned ?? "400+"} symbols scanned).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.hits.map((hit) => {
              const biasColor =
                hit.bias === "positive"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                  : hit.bias === "negative"
                    ? "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300"
                    : "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300";

              return (
                <div
                  key={hit.scanner}
                  className={cn("rounded-lg border p-3 flex flex-col justify-between transition-colors", biasColor)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{hit.label}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs uppercase font-bold px-1.5 py-0",
                            hit.bias === "positive" && "border-emerald-500 text-emerald-600",
                            hit.bias === "negative" && "border-rose-500 text-rose-600",
                            hit.bias === "watch" && "border-blue-500 text-blue-600",
                          )}
                        >
                          {hit.bias}
                        </Badge>
                      </div>
                      {hit.trigger ? (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{hit.trigger}</p>
                      ) : null}
                    </div>
                    {hit.changePct != null ? (
                      <span className={cn("text-sm font-bold tabular-nums", hit.changePct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {hit.changePct >= 0 ? "+" : ""}{hit.changePct.toFixed(2)}%
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/30 text-sm">
                    <span className="text-muted-foreground">Scanner ID: {hit.scanner}</span>
                    <Link
                      href={`/intelligence/scanner?scanner=${encodeURIComponent(hit.scanner)}`}
                      className="font-medium text-primary hover:underline"
                    >
                      View scanner table →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Intentional Guest vs Signed-in state difference (Handbook Page 5 & 8) */}
        {!authenticated ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              <strong>Guest mode:</strong> Showing public radar highlights. Sign in to create automated webhook/email alerts whenever {symbol} triggers any scanner.
            </span>
            <Link
              href="/auth/sign-in"
              className="shrink-0 font-semibold text-primary hover:underline"
            >
              Sign in for alerts →
            </Link>
          </div>
        ) : (
          <div className="flex justify-end text-sm">
            <Link href="/alerts" className="text-primary hover:underline font-medium">
              Configure alert notification rules for {symbol} →
            </Link>
          </div>
        )}
      </div>
    </Panel>
  );
}
