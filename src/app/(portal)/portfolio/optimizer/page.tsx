"use client";

import { Bars } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MetricInfo } from "@/components/ui/metric-info";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { formatPct } from "@/lib/format";
import { optimizeWeightsFromReturns, type OptimizeGoal } from "@/lib/optimizer";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signClass } from "@/lib/sign-color";
import { cn } from "@/lib/utils";

function yahooSymbol(market: string, symbol: string) {
  return market === "IN" ? `${symbol}.NS` : symbol;
}

async function fetchDailyReturns(market: string, symbol: string): Promise<number[]> {
  const ysym = yahooSymbol(market, symbol);
  const res = await fetch(`/api/feeds/yahoo/history?symbol=${encodeURIComponent(ysym)}&range=1y`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as { points?: { date: string; value: number }[] };
  const pts = [...(json.points ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const closes = pts.map((p) => p.value).filter((v) => v > 0);
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    rets.push(closes[i]! / closes[i - 1]! - 1);
  }
  return rets;
}

export default function OptimizerPage() {
  const { data, loading, error, locked } = useMyPortfolio();
  const [goal, setGoal] = useState<OptimizeGoal>("maxSharpe");
  const [returnsBySymbol, setReturnsBySymbol] = useState<Map<string, number[]>>(new Map());
  const [fetching, setFetching] = useState(false);

  const symbols = useMemo(() => data?.positions.map((p) => p.symbol) ?? [], [data]);

  useEffect(() => {
    if (!symbols.length || !data?.positions.length) {
      setReturnsBySymbol(new Map());
      return;
    }
    let cancelled = false;
    setFetching(true);
    Promise.all(
      data.positions.map(async (p) => {
        const rets = await fetchDailyReturns(p.market, p.symbol);
        return [p.symbol, rets] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setReturnsBySymbol(new Map(pairs));
      setFetching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [data?.positions, symbols.length]);

  const result = useMemo(() => {
    const usable = symbols.filter((s) => (returnsBySymbol.get(s)?.length ?? 0) >= 20);
    if (usable.length === 0) {
      return { weights: [], stats: { vol: 0, ret: 0, sharpe: 0 } };
    }
    const rets = usable.map((s) => returnsBySymbol.get(s)!);
    return optimizeWeightsFromReturns(usable, rets, goal);
  }, [symbols, returnsBySymbol, goal]);

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Optimizer"
        title="A better mix?"
        subtitle={
          data?.hasHoldings
            ? "Suggests how to split your money across the stocks you hold, based on the last year. A learning tool — not advice."
            : "Suggests how to split your money across the stocks you hold, based on the last year. Add your holdings to try it. A learning tool — not advice."
        }
      />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading portfolio…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && data && !data.hasHoldings ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {locked ? (
            <>
              <Link href="/login?next=/portfolio/optimizer" className="font-semibold text-blue-600 hover:underline">
                Log in
              </Link>{" "}
              to import holdings.
            </>
          ) : (
            <>
              No positions.{" "}
              <Link href="/portfolio" className="font-semibold text-blue-600 hover:underline">
                Open Portfolio
              </Link>
            </>
          )}
        </div>
      ) : null}

      {data?.hasHoldings ? (
        <>
          <p className="text-xs text-muted-foreground">Daily prices for the last year come from Yahoo Finance.</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["maxSharpe", "Max Sharpe"],
                ["minVol", "Min volatility"],
                ["riskParity", "Risk parity"],
              ] as const
            ).map(([id, label]) => (
              <Button key={id} variant={goal === id ? "default" : "outline"} onClick={() => setGoal(id)}>
                {label}
              </Button>
            ))}
          </div>
          {fetching ? <p className="text-sm text-muted-foreground">Loading return history…</p> : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Tile metricId="total_return" label="Expected return" value={formatPct(result.stats.ret)} signed />
            <Tile metricId="beta" label="Expected vol" value={formatPct(result.stats.vol)} />
            <Tile metricId="sharpe" label="Sharpe" value={result.stats.sharpe.toFixed(2)} />
          </div>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <span>Target weights</span>
                <MetricInfo id="concentration" name="Optimized Target Weights" iconSize="xs" />
              </span>
            }
          >
            {result.weights.length ? (
              <div className="h-[420px]">
                <Bars data={result.weights.map((w) => ({ name: w.symbol, value: w.weight }))} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Need at least one holding with 20+ daily returns.</p>
            )}
          </Panel>
          {result.weights.length && data.positions.length ? (
            <Panel title="Rebalance diff" subtitle="Current weight vs optimized target (manual adjust on Portfolio)">
              <div className="overflow-x-auto text-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-3">Symbol</th>
                      <th className="py-2 pr-3 text-right">Current</th>
                      <th className="py-2 pr-3 text-right">Target</th>
                      <th className="py-2 text-right">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.weights.map((w) => {
                      const cur = data.positions.find((p) => p.symbol === w.symbol)?.weight ?? 0;
                      const delta = w.weight - cur;
                      return (
                        <tr key={w.symbol} className="border-b border-border/60">
                          <td className="py-2 pr-3 font-medium">{w.symbol}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatPct(cur, 1, false)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatPct(w.weight, 1, false)}</td>
                          <td className={cn("py-2 text-right tabular-nums", signClass(delta))}>{formatPct(delta, 1, true)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Tile({ metricId, label, value, signed = false }: { metricId?: string; label: string; value: string; signed?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <MetricInfo id={metricId ?? "sharpe"} name={label} iconSize="xs" />
      </div>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", signed && signClass(value))}>{value}</p>
    </div>
  );
}
