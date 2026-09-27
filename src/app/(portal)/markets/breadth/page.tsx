"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { useNiftyMomentum } from "@/hooks/use-nifty-momentum";
import { MetricInfo } from "@/components/ui/metric-info";
import { MarketMomentumCard } from "@/components/dashboard/market-momentum-card";
import { formatDmaLine } from "@/lib/market/nifty-technicals";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

function breadthRegime(adv: number, dec: number): string {
  const ratio = adv / Math.max(dec, 1);
  if (ratio >= 1.8) return "Broad participation (advances lead)";
  if (ratio >= 1.2) return "Constructive breadth";
  if (ratio <= 0.6) return "Broad weakness (declines lead)";
  if (ratio <= 0.85) return "Defensive breadth";
  return "Mixed / indecisive";
}

export default function MarketBreadthPage() {
  const { data, loading, error } = useIndiaDashboard(45_000);
  const { momentum } = useNiftyMomentum();
  const breadth = data?.pulse?.breadth;
  const hasBreadth =
    breadth &&
    breadth.advances != null &&
    breadth.declines != null &&
    (breadth.advances > 0 || breadth.declines > 0);

  const adv = hasBreadth ? breadth!.advances! : null;
  const dec = hasBreadth ? breadth.declines! : null;
  const unch = hasBreadth ? (breadth!.unchanged ?? 0) : null;
  const h52 = breadth?.high52w ?? null;
  const l52 = breadth?.low52w ?? null;
  const total = adv != null && dec != null && unch != null ? adv + dec + unch : 0;
  const advPct = total > 0 && adv != null ? Math.round((adv / total) * 100) : null;
  const decPct = total > 0 && dec != null ? Math.round((dec / total) * 100) : null;
  const asOf = data?.fetchedAt ?? null;
  const breadthSource = breadth?.source;

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Market Internals"
        title="Market Breadth & Momentum Desk"
        subtitle="Advance/decline and 52-week expansion from the India dashboard feed; NIFTY trend from daily closes."
      />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading market breadth…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && !hasBreadth ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Live breadth not available right now (NSE/Upstox feed may be closed or rate-limited). Refresh in a few minutes.
        </p>
      ) : null}

      {hasBreadth && adv != null && dec != null && unch != null && advPct != null && decPct != null ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="rounded-xl border border-emerald-500/30 bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground uppercase flex items-center gap-1">
                  <TrendingUp className="size-3 text-emerald-600" />
                  ADVANCING EQUITIES
                </span>
                <MetricInfo id="advances" asOf={asOf ?? undefined} provider={breadthSource?.provider} sourceUrl={breadthSource?.url} />
              </div>
              <div className="text-3xl font-bold text-emerald-600 tabular-nums">{adv.toLocaleString()}</div>
              <span className="text-sm text-muted-foreground">{advPct}% of traded universe</span>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground uppercase flex items-center gap-1">
                  <TrendingDown className="size-3 text-rose-600" />
                  DECLINING EQUITIES
                </span>
                <MetricInfo id="declines" asOf={asOf ?? undefined} provider={breadthSource?.provider} sourceUrl={breadthSource?.url} />
              </div>
              <div className="text-3xl font-bold text-rose-600 tabular-nums">{dec.toLocaleString()}</div>
              <span className="text-sm text-muted-foreground">{decPct}% of traded universe</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground uppercase">52-WEEK HIGHS</span>
                <MetricInfo id="high52w" asOf={asOf ?? undefined} provider={breadthSource?.provider} sourceUrl={breadthSource?.url} />
              </div>
              <div className="text-3xl font-bold text-emerald-600 tabular-nums">{h52 ?? "—"}</div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground uppercase">52-WEEK LOWS</span>
                <MetricInfo id="low52w" asOf={asOf ?? undefined} provider={breadthSource?.provider} sourceUrl={breadthSource?.url} />
              </div>
              <div className="text-3xl font-bold text-rose-600 tabular-nums">{l52 ?? "—"}</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm shadow-sm">
            <div className="flex justify-between items-center text-sm font-semibold flex-wrap gap-2">
              <span className="text-emerald-600 flex items-center gap-1">
                Advances: {adv.toLocaleString()} ({advPct}%)
              </span>
              <span className="text-muted-foreground">Unchanged: {unch.toLocaleString()}</span>
              <span className="text-rose-600 flex items-center gap-1">
                Declines: {dec.toLocaleString()} ({decPct}%)
              </span>
            </div>
            <div className="h-4 w-full rounded-full bg-accent overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${advPct}%` }} />
              <div className="h-full bg-muted-foreground/30" style={{ width: `${100 - advPct - decPct}%` }} />
              <div className="h-full bg-rose-500" style={{ width: `${decPct}%` }} />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground pt-1 items-center flex-wrap gap-2">
              <span className="tabular-nums">Advance/Decline Ratio: {(adv / (dec || 1)).toFixed(2)}x</span>
              <span className="font-bold text-foreground">{breadthRegime(adv, dec)}</span>
            </div>
          </div>
        </>
      ) : null}

      <section id="momentum" className="space-y-3 scroll-mt-20 mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Trend &amp; Momentum Regimes
        </h2>
        <div className="bento-grid-cols-2">
          <MarketMomentumCard />

          <Panel
            title={
              <span className="flex items-center gap-1.5">
                <Activity className="size-4 text-primary" />
                Benchmark Trend Strength Summary
              </span>
            }
          >
            {momentum ? (
              <div className="space-y-3 divide-y divide-border/50 text-sm">
                {(
                  [
                    ["NIFTY 50 Short-Term Trend (20 DMA)", momentum.vsDma20],
                    ["Medium-Term Trend (50 DMA)", momentum.vsDma50],
                    ["Macro Structural Trend (200 DMA)", momentum.vsDma200],
                  ] as const
                ).map(([label, pct]) => (
                  <div key={label} className="pt-2 first:pt-0 flex justify-between items-center gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn("font-bold tabular-nums", pct != null && pct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatDmaLine(pct, pct != null && pct >= 0 ? "above" : "below")}
                    </span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">RSI Momentum State</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {momentum.rsi14 != null ? `${momentum.rsi14.toFixed(1)}` : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading NIFTY trend metrics…</p>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}
