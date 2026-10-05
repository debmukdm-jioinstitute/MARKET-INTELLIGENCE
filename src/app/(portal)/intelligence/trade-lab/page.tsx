"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { STRATEGIES, type BacktestResult, type StrategyId } from "@/lib/trade-lab/backtest";
import { TIMEFRAMES, type Bias, type IndicatorReading, type LabResult, type Timeframe } from "@/lib/trade-lab/types";
import { EquityChart } from "@/components/trade-lab/equity-chart";
import { IndicatorChart } from "@/components/trade-lab/indicator-chart";
import { chartKeysForReading, type ChartIndicatorKey } from "@/lib/trade-lab/chart-indicators";
import { recordBacktest, useTradeLabGame } from "@/components/trade-lab/gamification";
import { TradeLabStepper } from "@/components/trade-lab/stepper";
import { ReasonsAccordion, VerdictMeter } from "@/components/trade-lab/verdict-meter";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import useSWR from "swr";

type Universe = { indices: { id: string; label: string }[]; stocks: { symbol: string; name: string }[] };
type Failure = { error: string };

const STRATEGY_BLURB: Record<StrategyId, string> = {
  breakout: "Breaks 20-bar high · volume ≥1.5× · ADX>20",
  trend: "Above EMA50 · MACD bullish · Supertrend up",
  pullback: "Uptrend intact · RSI recovers above 40",
  meanrev: "Below lower Bollinger · RSI<30",
};
const STRATEGY_UI = STRATEGIES.map((s) => ({ ...s, blurb: STRATEGY_BLURB[s.id] }));

const WATCH_KEY = "mi-trade-lab-watch";
const EMPTY_WATCH: readonly string[] = [];
let watchRaw: string | null = null;
let watchParsed: readonly string[] = EMPTY_WATCH;
const watchListeners = new Set<() => void>();

function readWatch(): readonly string[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(WATCH_KEY); } catch { /* private mode */ }
  if (raw === watchRaw) return watchParsed; // stable identity unless storage changed
  watchRaw = raw;
  try {
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    watchParsed = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, 12) : EMPTY_WATCH;
  } catch { watchParsed = EMPTY_WATCH; }
  return watchParsed;
}
function writeWatch(next: string[]) {
  try { localStorage.setItem(WATCH_KEY, JSON.stringify(next.slice(0, 12))); } catch { /* ignore */ }
  watchListeners.forEach((l) => l());
}
function subscribeWatch(cb: () => void) {
  watchListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { watchListeners.delete(cb); window.removeEventListener("storage", cb); };
}

type WatchRow = { symbol: string; last?: number; changePct?: number; verdict?: Bias; verdictLabel?: string; rsi?: string | null; stale?: boolean; error?: string };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as T & Partial<Failure>;
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

const biasBadge: Record<Bias, string> = {
  bullish: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  bearish: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
};
const biasLabel: Record<Bias, string> = { bullish: "Bullish", bearish: "Bearish", neutral: "Neutral" };

const ist = (epochSec: number, intraday: boolean) =>
  new Date(epochSec * 1000).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: intraday ? undefined : "numeric",
    ...(intraday ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  });
const money = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number | null, d = 1) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`);

function Sparkline({ values, bias }: { values: (number | null)[]; bias: Bias }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return null;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const w = 120;
  const h = 32;
  const d = pts.map((p, k) => `${k ? "L" : "M"}${((p.i / (values.length - 1)) * w).toFixed(1)},${(h - 3 - ((p.v - min) / span) * (h - 6)).toFixed(1)}`).join(" ");
  const stroke = bias === "bullish" ? "#059669" : bias === "bearish" ? "#e11d48" : "#6b7280";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function CandleChart({ candles }: { candles: LabResult["candles"] }) {
  const w = 900;
  const h = 220;
  const hi = Math.max(...candles.map((c) => c.h));
  const lo = Math.min(...candles.map((c) => c.l));
  const span = hi - lo || 1;
  const y = (p: number) => 6 + (1 - (p - lo) / span) * (h - 12);
  const step = w / candles.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" role="img" aria-label="Recent candles">
      {candles.map((c, i) => {
        const x = i * step + step / 2;
        const up = c.c >= c.o;
        const col = up ? "#059669" : "#e11d48";
        return (
          <g key={c.t}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={1} />
            <rect x={x - step * 0.32} width={step * 0.64} y={y(Math.max(c.o, c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={col} />
          </g>
        );
      })}
    </svg>
  );
}

function IndicatorCard({ ind, onPlot }: { ind: IndicatorReading; onPlot?: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">{ind.label}</div>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold", biasBadge[ind.bias])}>{biasLabel[ind.bias]}</span>
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-foreground">{ind.value}</div>
      {ind.detail.length ? <div className="text-xs tabular-nums text-muted-foreground">{ind.detail.join(" · ")}</div> : null}
      <Sparkline values={ind.spark} bias={ind.bias} />
      <p className="mt-1 text-sm leading-snug text-foreground"><span className="font-medium">What this means: </span>{ind.reading}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">Rule: {ind.rule}</p>
      {onPlot ? (
        <button type="button" onClick={onPlot} className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-md border border-primary/40 px-2 text-xs font-semibold text-primary hover:bg-primary/5">
          Plot on chart ↑
        </button>
      ) : null}
    </div>
  );
}

function BacktestView({ r }: { r: BacktestResult }) {
  const stat = (label: string, value: string, tone?: string) => (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-bold tabular-nums", tone)}>{value}</div>
    </div>
  );
  return (
    <div className="space-y-4">
      {r.recent.length >= 2 ? <EquityChart result={r} /> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat("Total return", pct(r.totalReturnPct), r.totalReturnPct >= 0 ? "text-emerald-600" : "text-rose-600")}
        {stat("Max drawdown", `−${r.maxDrawdownPct.toFixed(1)}%`, "text-rose-600")}
        {stat("Win rate", r.winRate === null ? "—" : `${r.winRate.toFixed(0)}%`)}
        {stat("Trades", String(r.trades))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stat("Avg gain", pct(r.avgGainPct, 2), "text-emerald-600")}
        {stat("Avg loss", pct(r.avgLossPct, 2), "text-rose-600")}
        {stat("Strategy vs buy & hold", `${pct(r.totalReturnPct)} vs ${pct(r.buyHoldPct)}`)}
      </div>
      <div className="space-y-1 text-xs leading-5 text-muted-foreground">
        <p><span className="font-semibold text-foreground">Entry:</span> {r.entryRule}</p>
        <p><span className="font-semibold text-foreground">Exit:</span> {r.exitRule}</p>
        <p>Window: {ist(r.period.from, false)} → {ist(r.period.to, false)} · {r.period.bars.toLocaleString("en-IN")} daily bars</p>
      </div>
      {r.recent.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="text-muted-foreground"><tr><th className="py-1 pr-3 font-medium">Entry</th><th className="pr-3 font-medium">Exit</th><th className="pr-3 font-medium">In</th><th className="pr-3 font-medium">Out</th><th className="pr-3 font-medium">Return</th><th className="font-medium">Exit by</th></tr></thead>
            <tbody>
              {r.recent.map((t) => (
                <tr key={t.entryT} className="border-t border-border">
                  <td className="py-1 pr-3">{ist(t.entryT, false)}</td><td className="pr-3">{ist(t.exitT, false)}</td>
                  <td className="pr-3">{money(t.entry)}</td><td className="pr-3">{money(t.exit)}</td>
                  <td className={cn("pr-3 font-semibold", t.retPct >= 0 ? "text-emerald-600" : "text-rose-600")}>{pct(t.retPct, 2)}</td>
                  <td>{t.reason === "stop" ? "stop" : "time"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">This rule never fired in the window — nothing to report. That is a result, not an error.</p>
      )}
      <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">{r.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
    </div>
  );
}

/** Shown in steps 2–4 when no instrument data is loaded yet. */
function NeedsInstrument({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <p className="text-sm font-semibold text-foreground">Pick an instrument first</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        This step is computed from real exchange candles. Choose a stock or index in step 1 and it will appear here.
      </p>
      <button
        type="button"
        onClick={onGo}
        className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Go to step 1
      </button>
    </div>
  );
}

function NextButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        {children}
      </button>
    </div>
  );
}

export default function TradeLabPage() {
  return (
    <Suspense fallback={null}>
      <TradeLab />
    </Suspense>
  );
}

function TradeLab() {
  const sp = useSearchParams();
  const initialSymbol = (sp.get("symbol") ?? "NIFTY").toUpperCase().slice(0, 24);
  const initialTf = TIMEFRAMES.some((t) => t.id === sp.get("tf")) ? (sp.get("tf") as Timeframe) : "1d";
  const [symbol, setSymbol] = useState(initialSymbol);
  const [draft, setDraft] = useState("");
  const [tf, setTf] = useState<Timeframe>(initialTf);
  const [step, setStep] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const watch = useSyncExternalStore(subscribeWatch, readWatch, () => EMPTY_WATCH);
  const watchKey = watch.length ? `/api/trade/watch?symbols=${encodeURIComponent(watch.join(","))}&tf=1d` : null;
  const { data: watchData } = useSWR<{ rows: WatchRow[] }>(watchKey, getJson, { refreshInterval: 5 * 60_000, revalidateOnFocus: false });
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [strategy, setStrategy] = useState<StrategyId | null>(null);
  const [plotKeys, setPlotKeys] = useState<ChartIndicatorKey[] | undefined>(undefined);
  const chartRef = useRef<HTMLDivElement>(null);
  const game = useTradeLabGame();
  const recordedRef = useRef<string | null>(null);

  const { data: uni } = useSWR<Universe>("/api/trade/universe", getJson, { revalidateOnFocus: false });
  const labKey = `/api/trade/lab?symbol=${encodeURIComponent(symbol)}&tf=${tf}`;
  const { data, error, isLoading } = useSWR<LabResult>(labKey, getJson, { refreshInterval: tf === "1d" || tf === "1wk" || tf === "1mo" ? 5 * 60_000 : 60_000, keepPreviousData: false });
  const btKey = strategy ? `/api/trade/backtest?symbol=${encodeURIComponent(symbol)}&strategy=${strategy}` : null;
  const { data: bt, error: btError, isLoading: btLoading } = useSWR<BacktestResult>(btKey, getJson, { revalidateOnFocus: false });

  const intraday = TIMEFRAMES.find((t) => t.id === tf)!.intraday;
  const shown = useMemo(() => data?.indicators.filter((i) => !hidden.has(i.id)) ?? [], [data, hidden]);
  const ageSec = data ? Math.max(0, Math.round(data.fetchedAt / 1000 - data.asOf)) : 0;
  const fresh = !data ? null : !intraday ? { cls: "bg-muted text-muted-foreground", text: "End-of-day bars" } : ageSec < 300 ? { cls: "bg-emerald-500/10 text-emerald-700", text: "Live" } : ageSec < 3600 ? { cls: "bg-amber-500/10 text-amber-700", text: "Delayed" } : { cls: "bg-muted text-muted-foreground", text: "Stale — market closed or feed delayed" };

  const pick = (id: string) => { setSymbol(id); setStrategy(null); setStep(2); };
  const toggle = (id: string) => setHidden((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Gamification: first-backtest badge + per-strategy personal best (localStorage only).
  useEffect(() => {
    if (bt && strategy && !btError && bt.strategy === strategy) {
      const key = `${bt.symbol}:${bt.strategy}:${bt.period.to}`;
      if (recordedRef.current !== key) {
        recordedRef.current = key;
        const { firstEver, newBest } = recordBacktest(bt);
        const label = STRATEGY_UI.find((s) => s.id === strategy)?.label ?? strategy;
        if (firstEver && newBest) setNotice(`Badge earned — you ran your first backtest, and set a personal best for ${label}.`);
        else if (firstEver) setNotice("Badge earned — you ran your first backtest.");
        else if (newBest) setNotice(`New personal best for ${label}: ${pct(bt.totalReturnPct)} total return on ${bt.symbol}.`);
      }
    }
  }, [bt, strategy, btError]);

  // Auto-dismiss the badge/best toast.
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(id);
  }, [notice]);

  const btSubtitle =
    bt && strategy && !btError && bt.strategy === strategy
      ? `Ran on ${bt.period.bars.toLocaleString("en-IN")} daily bars (${ist(bt.period.from, false)} → ${ist(bt.period.to, false)}). Rules are fixed in advance — nothing is tuned to flatter the result.`
      : `Test a preset on ${symbol}'s real daily bars. Rules are fixed in advance — nothing is tuned to flatter the result.`;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-16">
      <PageHeader

        title="Indicators, patterns & backtests"
        subtitle="Pick an index or F&O stock. Every number is plain maths on real exchange candles — no AI model, no simulated data. Each signal shows the exact rule that produced it."
        trust={{ source: "Upstox exchange candles, Yahoo Finance fallback", note: "Rule-based technical readings, not recommendations", delayed: "Pre-computed every 15 min in market hours" }}
      />

      <TradeLabStepper step={step} onStep={setStep} />

      {error ? <p className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700">{error instanceof Error ? error.message : String(error)} Nothing is shown rather than a guess.</p> : null}
      {isLoading && !data ? <p className="text-sm text-muted-foreground">Loading candles for {symbol}…</p> : null}

      {step === 1 ? (
        <Panel title="Pick an instrument" subtitle="Choose what to study. Everything in the later steps is computed from this instrument's real exchange candles." collapsible={false}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(uni?.indices ?? [{ id: "NIFTY", label: "NIFTY 50" }, { id: "BANKNIFTY", label: "NIFTY BANK" }, { id: "SENSEX", label: "SENSEX" }, { id: "BANKEX", label: "BANKEX" }, { id: "INDIAVIX", label: "INDIA VIX" }]).map((i) => (
                <button key={i.id} type="button" onClick={() => pick(i.id)} className={cn("rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors", symbol === i.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}>{i.label}</button>
              ))}
            </div>
            <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); const v = draft.trim().toUpperCase(); if (v) { pick(v); setDraft(""); } }}>
              <input list="trade-lab-fo" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`F&O stock or any NSE symbol${uni ? ` (${uni.stocks.length} F&O names)` : ""}`} aria-label="Search symbol" className="min-w-[16rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <datalist id="trade-lab-fo">{uni?.stocks.map((s) => <option key={s.symbol} value={s.symbol}>{s.name}</option>)}</datalist>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Load</button>
            </form>
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Timeframe">
              {TIMEFRAMES.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tf === t.id} onClick={() => setTf(t.id)} className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", tf === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{t.label}</button>
              ))}
            </div>

            {data && !error ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-lg font-bold text-foreground">{data.symbol} <span className="text-sm font-medium text-muted-foreground">· {data.tf}</span></div>
                  <div className="flex items-center gap-2">
                    {fresh ? <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", fresh.cls)}>{data.stale ? "Stale — showing last good data" : fresh.text}</span> : null}
                    <button type="button" onClick={() => writeWatch(watch.includes(data.symbol) ? watch.filter((w) => w !== data.symbol) : [...watch, data.symbol])} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted" aria-pressed={watch.includes(data.symbol)}>
                      {watch.includes(data.symbol) ? "★ Watching" : "☆ Watch"}
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-1">
                  <div className="text-3xl font-bold tabular-nums">{money(data.price.last)}</div>
                  <div className={cn("text-lg font-semibold tabular-nums", data.price.change >= 0 ? "text-emerald-600" : "text-rose-600")}>{data.price.change >= 0 ? "+" : ""}{money(data.price.change)} ({pct(data.price.changePct, 2)}){intraday ? " vs prev close" : ""}</div>
                  <div className="text-sm tabular-nums text-muted-foreground">Range {money(data.price.dayLow)} – {money(data.price.dayHigh)}{data.price.volume ? ` · Vol ${data.price.volume.toLocaleString("en-IN")}` : ""}</div>
                </div>
                <div className="mt-3"><CandleChart candles={data.candles} /></div>
                <p className="mt-2 text-[11px] text-muted-foreground">Source: {data.source} ({data.yahooTicker}) · {data.bars} bars · last bar {ist(data.asOf, intraday)} IST{data.adjusted ? " · split-adjusted" : ""}</p>
              </div>
            ) : null}

            {watch.length ? (
              <div>
                <div className="mb-1.5 text-sm font-semibold text-foreground">Watchlist <span className="text-xs font-normal text-muted-foreground">· saved in this browser, daily verdict from the pre-computed cache</span></div>
                <div className="flex flex-wrap gap-2">
                  {watch.map((w) => {
                    const row = watchData?.rows.find((r) => r.symbol === w);
                    return (
                      <div key={w} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                        <button type="button" onClick={() => pick(w)} className="flex items-center gap-2 text-left">
                          <span className="font-semibold">{w}</span>
                          {row?.error ? <span className="text-xs text-muted-foreground">no data</span> : row?.last !== undefined ? (
                            <>
                              <span className="tabular-nums">{money(row.last)}</span>
                              <span className={cn("text-xs font-semibold tabular-nums", (row.changePct ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>{pct(row.changePct ?? 0, 2)}</span>
                              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", biasBadge[row.verdict ?? "neutral"])}>{biasLabel[row.verdict ?? "neutral"]}</span>
                              {row.rsi ? <span className="text-xs text-muted-foreground">RSI {row.rsi}</span> : null}
                            </>
                          ) : <span className="text-xs text-muted-foreground">…</span>}
                        </button>
                        <button type="button" aria-label={`Remove ${w}`} onClick={() => writeWatch(watch.filter((x) => x !== w))} className="text-muted-foreground hover:text-foreground">×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <NextButton onClick={() => setStep(2)}>See the verdict →</NextButton>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel title="Verdict & reasons" subtitle="How the readings stack up — bullish, neutral, bearish. Tap any reason to see the numbers behind it." collapsible={false}>
          {data && !error ? (
            <div className="space-y-4">
              <VerdictMeter verdict={data.verdict} animKey={`${data.symbol}:${data.tf}:${data.asOf}`} />
              <ReasonsAccordion data={data} />
            </div>
          ) : <NeedsInstrument onGo={() => setStep(1)} />}
          <NextButton onClick={() => setStep(3)}>Inspect the indicators →</NextButton>
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel title="Indicators" subtitle="Tick the ones you want to see. Every value is computed exactly from the candles — each card shows the rule." collapsible={false}>
          {data && !error ? (
            <div>
              <div ref={chartRef} className="mb-4 rounded-xl border border-border bg-card p-3">
                <div className="mb-2 text-sm font-semibold text-foreground">Chart <span className="text-xs font-normal text-muted-foreground">· click "Plot on chart" on any card below, or pick several indicators from the dropdown</span></div>
                <IndicatorChart symbol={symbol} tf={tf} onTfChange={setTf} forceIndicators={plotKeys} height={380} />
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {data.indicators.map((i) => (
                  <label key={i.id} className={cn("flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs", hidden.has(i.id) ? "border-border text-muted-foreground" : "border-primary/40 bg-primary/5 text-foreground")}>
                    <input type="checkbox" checked={!hidden.has(i.id)} onChange={() => toggle(i.id)} className="accent-primary" />
                    {i.label}
                  </label>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.map((i) => {
                const keys = chartKeysForReading(i.id);
                return <IndicatorCard key={i.id} ind={i} onPlot={keys.length ? () => { setPlotKeys(keys); chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); } : undefined} />;
              })}</div>
              {!data.indicators.some((i) => i.id === "mfi") ? <p className="mt-3 text-xs text-muted-foreground">Volume-based indicators (OBV, MFI, VWAP) are not shown: this instrument reports no traded volume.</p> : null}
            </div>
          ) : <NeedsInstrument onGo={() => setStep(1)} />}
          <NextButton onClick={() => setStep(4)}>Check the patterns →</NextButton>
        </Panel>
      ) : null}

      {step === 4 ? (
        <Panel title="Patterns & levels" subtitle="Candle shapes and chart patterns the rules spotted. The rule and numbers are shown — nothing is a black box, and no pattern is certain." collapsible={false}>
          {data && !error ? (
            <div>
              {data.patterns.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.patterns.map((p) => (
                    <div key={`${p.id}-${p.barsAgo}`} className="rounded-lg border border-border bg-background p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold">{p.name} <span className="text-xs font-normal text-muted-foreground">· {p.kind === "chart" ? "chart pattern" : "candlestick"}</span></div>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", biasBadge[p.bias])}>{biasLabel[p.bias]}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{p.barsAgo === 0 ? "On the latest bar" : `${p.barsAgo} bar${p.barsAgo > 1 ? "s" : ""} ago`} · {ist(p.time, intraday)} · confidence: {p.confidence}</div>
                      <p className="mt-1.5 text-sm"><span className="font-medium">What this means: </span>{p.why}</p>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">{p.numbers.join(" · ")}</p>
                      {p.history ? (
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          History ({p.history.sample}, daily, 10 bars after): {p.history.events.toLocaleString("en-IN")} events · avg {pct(p.history.fwd10, 2)}
                          {p.history.hit10 !== null ? ` · called direction ${p.history.hit10.toFixed(0)}% of the time vs ${p.bias === "bearish" ? (100 - p.history.base10).toFixed(0) : p.history.base10.toFixed(0)}% for a coin-flip drift baseline` : ""}.
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Rule: {p.rule}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No candlestick or chart pattern fires on the latest bars under the published rules.</p>}
              {data.levels.length ? (
                <div className="mt-4">
                  <div className="mb-1.5 text-sm font-semibold">Support & resistance zones <span className="text-xs font-normal text-muted-foreground">(swing pivots clustered within 0.6%, ≥2 touches)</span></div>
                  <div className="flex flex-wrap gap-2">
                    {data.levels.map((l) => (
                      <span key={`${l.kind}-${l.price}`} className={cn("rounded-md border px-2.5 py-1 text-xs tabular-nums", l.kind === "support" ? "border-emerald-500/30 text-emerald-700" : "border-rose-500/30 text-rose-700")}>
                        {l.kind === "support" ? "Support" : "Resistance"} {money(l.price)} · {l.touches} touches
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : <NeedsInstrument onGo={() => setStep(1)} />}
          <NextButton onClick={() => setStep(5)}>Run a backtest →</NextButton>
        </Panel>
      ) : null}

      {step === 5 ? (
        <Panel title="Strategy backtest" subtitle={btSubtitle} collapsible={false}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STRATEGY_UI.map((s) => {
              const best = game.bests[s.id];
              return (
                <button key={s.id} type="button" onClick={() => setStrategy(s.id)} className={cn("rounded-lg border p-3 text-left transition-colors", strategy === s.id ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted")}>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.blurb}</div>
                  <p className="mt-1.5 text-xs leading-snug text-muted-foreground"><span className="font-medium text-foreground">What this means: </span>{s.description}</p>
                  {best ? (
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      Your best: <span className={cn("font-bold tabular-nums", best.totalReturnPct >= 0 ? "text-emerald-600" : "text-rose-600")}>{pct(best.totalReturnPct)}</span> · {best.symbol}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            {!strategy ? <p className="text-sm text-muted-foreground">Pick a strategy to run it on {symbol}'s real history.</p> : null}
            {btLoading ? <p className="text-sm text-muted-foreground">Running backtest…</p> : null}
            {btError ? <p className="text-sm text-rose-700">{btError instanceof Error ? btError.message : String(btError)}</p> : null}
            {bt && strategy && !btError && bt.strategy === strategy ? <BacktestView r={bt} /> : null}
          </div>
        </Panel>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">
        Indicator values are standard formulas (Wilder RSI/ADX/ATR, SMA-seeded EMA/MACD) and are reproducible from the candles shown. Pattern detection is rule-based and approximate — a hammer is candle geometry, but a head-and-shoulders needs judgment thresholds, which are printed on every card. Past performance does not predict future returns. Descriptive analytics only, not investment advice. See <a href="/methodology" className="underline">methodology</a>.
      </p>

      {notice ? (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-emerald-500/40 bg-white px-4 py-3 shadow-lg" role="status">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-700" aria-hidden>✓</span>
          <p className="flex-1 text-sm font-medium text-foreground">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-lg leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>
      ) : null}
    </div>
  );
}
