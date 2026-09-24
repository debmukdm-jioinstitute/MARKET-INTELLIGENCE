"use client";

import { Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import type { BacktestRun } from "@/lib/scanner/types";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<{ run: BacktestRun | null; error?: string }>);
const COLORS = ["#1a73e8", "#e8710a", "#188038", "#a142f4", "#d93025"];
const biasCls = { buy: "text-emerald-600", sell: "text-rose-600", watch: "text-blue-600" } as const;
const fmt = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;

export function BacktestDashboard() {
  const { data, isLoading } = useSWR("/api/backtest", fetcher);
  const run = data?.run ?? null;
  const [horizon, setHorizon] = useState(2); // index into horizons: 1,3,5,10 sessions
  const [picked, setPicked] = useState<string[]>(["vcp", "rsi-oversold", "inside-bar-bear"]);
  const [sortBy, setSortBy] = useState<"edge" | "winRate" | "signals">("edge");

  const rows = useMemo(() => {
    if (!run) return [];
    return run.scanners
      .map((s) => ({ s, h: s.horizons[horizon] }))
      .sort((a, b) => (sortBy === "signals" ? b.h.signals - a.h.signals : b.h[sortBy] - a.h[sortBy]));
  }, [run, horizon, sortBy]);

  const chartIds = picked.filter((id) => run?.scanners.some((s) => s.id === id)).slice(0, 5);
  const chartData = useMemo(() => {
    if (!run) return [];
    const byId = new Map(run.scanners.map((s) => [s.id, s]));
    return run.benchmarkEquity.map((b, i) => {
      const row: Record<string, number | string> = { d: b.d, bench: b.v };
      for (const id of chartIds) row[id] = byId.get(id)?.equity[i]?.v ?? NaN;
      return row;
    });
  }, [run, chartIds]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading backtest…</p>;
  if (!run) {
    return <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No backtest has run yet. It runs weekly; the first result appears after the next scheduled run.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {run.symbols} Nifty 500 stocks · {run.from} → {run.to} · {run.sessions} sessions · updated {new Date(run.asOf).toLocaleDateString()}
      </p>

      <Panel title="Growth of ₹10,000" subtitle="Compounded daily on the average next-session return of every signal, vs the equal-weight Nifty 500 baseline. Pick up to 5 scanners.">
        <div className="mb-3 flex flex-wrap gap-2">
          {run.scanners.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : p.length < 5 ? [...p, s.id] : p))}
              className={cn("rounded-full border px-2.5 py-1 text-xs", picked.includes(s.id) ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-card hover:bg-accent")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
              <XAxis dataKey="d" tick={{ fontSize: 11 }} minTickGap={48} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={54} />
              <Tooltip formatter={(v, n) => [`₹${Number(v).toLocaleString("en-IN")}`, n === "bench" ? "Nifty 500 (equal-weight)" : run.scanners.find((s) => s.id === n)?.label ?? String(n)]} />
              <Line type="monotone" dataKey="bench" stroke="#80868b" strokeDasharray="5 4" dot={false} strokeWidth={2} name="bench" />
              {chartIds.map((id, i) => (
                <Line key={id} type="monotone" dataKey={id} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} name={id} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Scanner performance" subtitle="Signal at the close → enter next open → exit N sessions later. Sell scanners are scored as shorts. 'Edge' is average return minus the average of all stocks over the same period.">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Hold for</span>
          {run.scanners[0].horizons.map((h, i) => (
            <button key={h.days} type="button" onClick={() => setHorizon(i)} className={cn("rounded-md border px-2.5 py-1", horizon === i ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-card hover:bg-accent")}>
              {h.days} {h.days === 1 ? "session" : "sessions"}
            </button>
          ))}
          <span className="ml-auto text-muted-foreground">Sort by</span>
          {(["edge", "winRate", "signals"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setSortBy(k)} className={cn("rounded-md border px-2.5 py-1", sortBy === k ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-card hover:bg-accent")}>
              {k === "winRate" ? "Win rate" : k === "edge" ? "Edge" : "Signals"}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1 font-medium">Scanner</th>
                <th className="px-2 py-1 text-right font-medium">Signals</th>
                <th className="px-2 py-1 text-right font-medium">Win rate</th>
                <th className="px-2 py-1 text-right font-medium">Avg return</th>
                <th className="px-2 py-1 text-right font-medium">Median</th>
                <th className="px-2 py-1 text-right font-medium">All stocks</th>
                <th className="px-2 py-1 text-right font-medium">Edge</th>
                <th className="px-2 py-1 text-right font-medium">Worst</th>
                <th className="px-2 py-1 text-right font-medium">Best</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, h }) => (
                <tr key={s.id} className="border-t border-border/50">
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <span className={cn("mr-2 text-xs font-semibold uppercase", biasCls[s.bias])}>{s.bias}</span>
                    {s.label}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{h.signals.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{h.signals ? `${h.winRate.toFixed(1)}%` : "—"}</td>
                  <td className={cn("px-2 py-1.5 text-right tabular-nums", h.avgRet >= 0 ? "text-emerald-600" : "text-rose-600")}>{h.signals ? fmt(h.avgRet) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{h.signals ? fmt(h.medRet) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(h.bench)}</td>
                  <td className={cn("px-2 py-1.5 text-right font-semibold tabular-nums", h.edge >= 0 ? "text-emerald-600" : "text-rose-600")}>{h.signals ? fmt(h.edge) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{h.signals ? fmt(h.worst, 1) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{h.signals ? fmt(h.best, 1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-xs text-muted-foreground">
        {run.method} Signals cluster in time and across stocks, so they are not independent trades; a positive edge over a single two-year window is not evidence of a durable strategy. Research and education only — not investment advice.
      </p>
    </div>
  );
}
