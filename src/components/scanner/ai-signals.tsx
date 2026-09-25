"use client";

import { Panel } from "@/components/layout/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FNO_INDEX_OPTIONS,
  pickIndexSignal,
  SIGNAL_HORIZON_OPTIONS,
  type FnoIndexId,
  type SignalHorizon,
} from "@/lib/scanner/fno-indices";
import { cn } from "@/lib/utils";
import type { IndexSignalBlock, SignalsRun, StockSignal } from "@/lib/scanner/types";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<{ run: SignalsRun | null }>);
const pct = (n: number, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;
const lean = { Bullish: "text-emerald-600", Bearish: "text-rose-600", Neutral: "text-muted-foreground" } as const;

function horizonLabel(h: number) {
  return h === 1 ? "next session" : `next ${h} sessions`;
}

/** Edge over a baseline in percentage points, with a 2-standard-error threshold for a binomial rate. */
function verdict(rate: number, baseline: number, n: number) {
  const edge = rate - baseline;
  const se = Math.sqrt(0.25 / Math.max(n, 1)) * 100;
  if (edge > 2 * se) return { edge, text: "Beats the baseline by more than chance would explain", tone: "text-emerald-600" };
  if (edge < -2 * se) return { edge, text: "Worse than the baseline", tone: "text-rose-600" };
  return { edge, text: "Not distinguishable from the baseline — treat as no demonstrated edge", tone: "text-amber-600" };
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{v}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Lean({ p }: { p: number | null }) {
  if (p == null) return <span className="text-muted-foreground">n/a</span>;
  return (
    <div className="mt-2">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-500/70 via-muted to-emerald-500/70">
        <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground" style={{ left: `${p * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>Down</span>
        <span>50%</span>
        <span>Up</span>
      </div>
    </div>
  );
}

function StockTable({ rows, side }: { rows: StockSignal[]; side: "buy" | "sell" }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No stock clears the {side === "buy" ? "65%" : "35%"} threshold in the latest session.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="px-2 py-1 font-medium">Stock</th>
            <th className="px-2 py-1 text-right font-medium">P(up)</th>
            <th className="px-2 py-1 text-right font-medium">Entry</th>
            <th className="px-2 py-1 text-right font-medium">Target</th>
            <th className="px-2 py-1 text-right font-medium">Stop</th>
            <th className="px-2 py-1 text-right font-medium">R:R</th>
            <th className="px-2 py-1 text-right font-medium">RSI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol} className="border-t border-border/50">
              <td className="whitespace-nowrap px-2 py-1.5">
                <Link href={`/research/${encodeURIComponent(r.symbol)}`} className="font-semibold text-primary hover:underline">{r.symbol}</Link>
                <span className="ml-2 text-muted-foreground">{r.industry}</span>
              </td>
              <td className={cn("px-2 py-1.5 text-right tabular-nums", side === "buy" ? "text-emerald-600" : "text-rose-600")}>{(r.pUp * 100).toFixed(0)}%</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{r.entry.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{r.target.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{r.stop.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{(Math.abs(r.target - r.entry) / Math.abs(r.entry - r.stop)).toFixed(2)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{r.rsi == null ? "—" : r.rsi.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndexModelSection({ horizon, model, indexLabel }: { horizon: SignalHorizon; model: IndexSignalBlock; indexLabel: string }) {
  const v = model.validation;
  const nv = verdict(v.accuracy, v.alwaysUp, v.days);
  const hText = horizonLabel(horizon);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Stat k={indexLabel} v={model.close.toLocaleString("en-IN", { maximumFractionDigits: 2 })} sub={`${pct(model.changePct, 2)} on the session`} />
        <div className="rounded-lg border border-border bg-card p-3 md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Model lean · {hText}</p>
          <p className={cn("mt-1 text-xl font-semibold", lean[model.call])}>
            {model.call}{" "}
            {model.pUp != null ? <span className="text-base tabular-nums text-muted-foreground">· P(up) {(model.pUp * 100).toFixed(0)}%</span> : null}
          </p>
          <Lean p={model.pUp} />
        </div>
        <Stat k="Trend" v={model.trend.split(" (")[0]} sub={`20 EMA ${model.ema20.toFixed(0)} · 50 EMA ${model.ema50.toFixed(0)}`} />
      </div>

      <div className={cn("rounded-lg border border-border bg-card p-4 text-sm")}>
        <p className="font-semibold">
          How reliable is this model ({indexLabel}, {horizon}-session horizon)? <span className={nv.tone}>{nv.text}.</span>
        </p>
        <p className="mt-1 text-muted-foreground">
          Over {v.days} out-of-sample windows ({v.from} → {v.to}) it called the {hText} direction correctly {v.accuracy.toFixed(1)}% of the time; simply always predicting &quot;up&quot; would have been right {v.alwaysUp.toFixed(1)}%.
          A lean is a statistical tilt from the most similar past days, not a forecast.
        </p>
      </div>

      <Panel
        title={`Walk-forward track record — ${indexLabel}`}
        subtitle={`Each prediction uses only data available at that day's close; the outcome is the ${hText}. Long when P(up) > 55%, short when < 45%, flat otherwise (gross of costs).`}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <Stat k="Predictions scored" v={v.days.toLocaleString("en-IN")} />
          <Stat k="Direction accuracy" v={`${v.accuracy.toFixed(1)}%`} sub={`always-up baseline ${v.alwaysUp.toFixed(1)}%`} />
          <Stat k="Model strategy" v={pct(v.strategyReturn)} sub="₹10,000 compounded" />
          <Stat k="Buy & hold" v={pct(v.buyHoldReturn)} sub="same period" />
        </div>
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={v.equity} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
              <XAxis dataKey="d" tick={{ fontSize: 11 }} minTickGap={48} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={(x) => `₹${(x / 1000).toFixed(0)}k`} width={54} />
              <Tooltip formatter={(x, name) => [`₹${Number(x).toLocaleString("en-IN")}`, name === "strategy" ? "Model strategy" : "Buy & hold"]} />
              <Line type="monotone" dataKey="strategy" stroke="#1a73e8" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="buyHold" stroke="#80868b" strokeDasharray="5 4" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-1 font-medium">When the model said…</th>
                  <th className="px-2 py-1 text-right font-medium">Days</th>
                  <th className="px-2 py-1 text-right font-medium">Right</th>
                  <th className="px-2 py-1 text-right font-medium">Avg move</th>
                </tr>
              </thead>
              <tbody>
                {v.buckets.map((b) => (
                  <tr key={b.label} className="border-t border-border/50">
                    <td className="px-2 py-1.5">{b.label}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{b.n}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{b.hitRate == null ? "—" : `${b.hitRate.toFixed(1)}%`}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{b.avgRet == null ? "—" : pct(b.avgRet, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">&quot;Right&quot; = the call&apos;s direction was correct over the selected horizon.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-1 font-medium">Date</th>
                  <th className="px-2 py-1 text-right font-medium">P(up)</th>
                  <th className="px-2 py-1 font-medium">Call</th>
                  <th className="px-2 py-1 font-medium">Actual</th>
                  <th className="px-2 py-1 text-right font-medium">Return</th>
                </tr>
              </thead>
              <tbody>
                {v.recent.map((r) => (
                  <tr key={r.d} className="border-t border-border/50">
                    <td className="px-2 py-1.5 tabular-nums">{r.d}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{(r.pUp * 100).toFixed(0)}%</td>
                    <td className="px-2 py-1.5">{r.call}</td>
                    <td className={cn("px-2 py-1.5", r.call === r.actual ? "text-emerald-600" : "text-rose-600")}>{r.actual}{r.call === r.actual ? " ✓" : " ✗"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{pct(r.retPct, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">Most recent 15 predictions and outcomes over {horizon} session(s).</p>
          </div>
        </div>
      </Panel>
    </>
  );
}

export function AiSignals() {
  const [indexId, setIndexId] = useState<FnoIndexId>("nifty50");
  const [horizon, setHorizon] = useState<SignalHorizon>(1);
  const { data, isLoading } = useSWR("/api/signals", fetcher, { refreshInterval: 10 * 60_000 });
  const run = data?.run ?? null;

  const indexLabel = FNO_INDEX_OPTIONS.find((x) => x.id === indexId)?.label ?? "Index";
  const model = useMemo(() => (run ? pickIndexSignal(run, indexId, horizon) : null), [run, indexId, horizon]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!run) return <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No signals have been computed yet. They refresh after each NSE close.</p>;

  const sv = run.stocks.validation;
  const bv = verdict(sv.buy.hitRate, sv.base.upRate, sv.buy.n);
  const sellV = verdict(sv.sell.hitRate, 100 - sv.base.upRate, sv.sell.n);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <label htmlFor="fno-index" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            F&O index
          </label>
          <Select value={indexId} onValueChange={(v) => setIndexId(v as FnoIndexId)}>
            <SelectTrigger id="fno-index" className="w-full">
              <SelectValue placeholder="Select index" />
            </SelectTrigger>
            <SelectContent>
              {FNO_INDEX_OPTIONS.map((idx) => (
                <SelectItem key={idx.id} value={idx.id}>
                  {idx.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <label htmlFor="signal-horizon" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Horizon
          </label>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v) as SignalHorizon)}>
            <SelectTrigger id="signal-horizon" className="w-full">
              <SelectValue placeholder="Select horizon" />
            </SelectTrigger>
            <SelectContent>
              {SIGNAL_HORIZON_OPTIONS.map((h) => (
                <SelectItem key={h.value} value={String(h.value)}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground sm:pb-2">
          Session {run.lastBar} · updated {new Date(run.asOf).toLocaleString()}
        </p>
      </div>

      {!model ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
          No precomputed model for {indexLabel} at this horizon yet. It fills in after the next signals job (post NSE close). Try NIFTY 50 · 1 session meanwhile.
        </p>
      ) : (
        <IndexModelSection horizon={horizon} model={model} indexLabel={indexLabel} />
      )}

      <Panel
        title="BTST / STBT candidates — Nifty 500"
        subtitle={`Same model run on each stock's own history (1-session horizon). Buy today's close, sell tomorrow (BTST); short today, cover tomorrow (STBT). Targets and stops are ATR-based levels (1.0× and 0.75× ATR), not model outputs. ${run.stocks.scanned} stocks scanned.`}
      >
        <div className={cn("mb-4 rounded-lg border border-border bg-card p-3 text-sm")}>
          <p className="font-semibold">Track record over the last {sv.sessions} sessions, all stocks</p>
          <p className="mt-1 text-muted-foreground">
            Buy calls (P ≥ 65%): {sv.buy.n.toLocaleString("en-IN")} signals, rose the next day {sv.buy.hitRate.toFixed(1)}% of the time, average {pct(sv.buy.avgRet, 2)} — vs {sv.base.upRate.toFixed(1)}% and {pct(sv.base.avgRet, 2)} for the average stock-day. <span className={bv.tone}>{bv.text}.</span>
          </p>
          <p className="mt-1 text-muted-foreground">
            Sell calls (P ≤ 35%): {sv.sell.n.toLocaleString("en-IN")} signals, fell the next day {sv.sell.hitRate.toFixed(1)}% of the time, average short return {pct(sv.sell.avgRet, 2)}. <span className={sellV.tone}>{sellV.text}.</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Signals cluster in time and across stocks, so they are not independent trades.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-emerald-600">BTST — highest P(up)</h3>
            <StockTable rows={run.stocks.btst} side="buy" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-rose-600">STBT — lowest P(up)</h3>
            <StockTable rows={run.stocks.stbt} side="sell" />
          </div>
        </div>
      </Panel>

      <p className="text-xs text-muted-foreground">
        Method: Lorentzian nearest-neighbour classifier on RSI, CCI, 1- and 5-day returns, distance from the 20/50-day averages and MACD; the 12 most similar past days vote. Research and education only — not investment advice; the walk-forward record above is the honest measure of what this model has done, and past performance does not predict future results.
      </p>
    </div>
  );
}
