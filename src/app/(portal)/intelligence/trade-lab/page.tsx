"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import type { BacktestResult, StrategyId } from "@/lib/trade-lab/backtest";
import { TIMEFRAMES, type Bias, type IndicatorReading, type LabResult, type Timeframe } from "@/lib/trade-lab/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import useSWR from "swr";

type Universe = { indices: { id: string; label: string }[]; stocks: { symbol: string; name: string }[] };
type Failure = { error: string };

const STRATEGY_UI: { id: StrategyId; label: string; blurb: string }[] = [
  { id: "breakout", label: "Breakout", blurb: "Breaks 20-bar high · volume ≥1.5× · ADX>20" },
  { id: "trend", label: "Trend-following", blurb: "Above EMA50 · MACD bullish · Supertrend up" },
  { id: "pullback", label: "Pullback", blurb: "Uptrend intact · RSI recovers above 40" },
  { id: "meanrev", label: "Mean-reversion", blurb: "Below lower Bollinger · RSI<30" },
];

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

const biasText: Record<Bias, string> = { bullish: "text-emerald-600", bearish: "text-rose-600", neutral: "text-muted-foreground" };
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

function IndicatorCard({ ind }: { ind: IndicatorReading }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">{ind.label}</div>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold", biasBadge[ind.bias])}>{biasLabel[ind.bias]}</span>
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-foreground">{ind.value}</div>
      {ind.detail.length ? <div className="text-xs tabular-nums text-muted-foreground">{ind.detail.join(" · ")}</div> : null}
      <Sparkline values={ind.spark} bias={ind.bias} />
      <p className="mt-1 text-sm leading-snug text-foreground">{ind.reading}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">Rule: {ind.rule}</p>
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
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stat("Trades", String(r.trades))}
        {stat("Win rate", r.winRate === null ? "—" : `${r.winRate.toFixed(0)}%`)}
        {stat("Avg gain", pct(r.avgGainPct, 2), "text-emerald-600")}
        {stat("Avg loss", pct(r.avgLossPct, 2), "text-rose-600")}
        {stat("Max drawdown", `−${r.maxDrawdownPct.toFixed(1)}%`, "text-rose-600")}
        {stat("Strategy vs buy & hold", `${pct(r.totalReturnPct)} vs ${pct(r.buyHoldPct)}`)}
      </div>
      <div className="space-y-1 text-xs leading-5 text-muted-foreground">
        <p><span className="font-semibold text-foreground">Entry:</span> {r.entryRule}</p>
        <p><span className="font-semibold text-foreground">Exit:</span> {r.exitRule}</p>
        <p>Window: {ist(r.period.from, false)} → {ist(r.period.to, false)} · {r.period.bars} daily bars</p>
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
  const watch = useSyncExternalStore(subscribeWatch, readWatch, () => EMPTY_WATCH);
  const watchKey = watch.length ? `/api/trade/watch?symbols=${encodeURIComponent(watch.join(","))}&tf=1d` : null;
  const { data: watchData } = useSWR<{ rows: WatchRow[] }>(watchKey, getJson, { refreshInterval: 5 * 60_000, revalidateOnFocus: false });
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [strategy, setStrategy] = useState<StrategyId | null>(null);

  const { data: uni } = useSWR<Universe>("/api/trade/universe", getJson, { revalidateOnFocus: false });
  const labKey = `/api/trade/lab?symbol=${encodeURIComponent(symbol)}&tf=${tf}`;
  const { data, error, isLoading } = useSWR<LabResult>(labKey, getJson, { refreshInterval: tf === "1d" || tf === "1wk" || tf === "1mo" ? 5 * 60_000 : 60_000, keepPreviousData: false });
  const btKey = strategy ? `/api/trade/backtest?symbol=${encodeURIComponent(symbol)}&strategy=${strategy}` : null;
  const { data: bt, error: btError, isLoading: btLoading } = useSWR<BacktestResult>(btKey, getJson, { revalidateOnFocus: false });

  const intraday = TIMEFRAMES.find((t) => t.id === tf)!.intraday;
  const shown = useMemo(() => data?.indicators.filter((i) => !hidden.has(i.id)) ?? [], [data, hidden]);
  const ageSec = data ? Math.max(0, Math.round(data.fetchedAt / 1000 - data.asOf)) : 0;
  const fresh = !data ? null : !intraday ? { cls: "bg-muted text-muted-foreground", text: "End-of-day bars" } : ageSec < 300 ? { cls: "bg-emerald-500/10 text-emerald-700", text: "Live" } : ageSec < 3600 ? { cls: "bg-amber-500/10 text-amber-700", text: "Delayed" } : { cls: "bg-muted text-muted-foreground", text: "Stale — market closed or feed delayed" };

  const pick = (id: string) => { setSymbol(id); setStrategy(null); };
  const toggle = (id: string) => setHidden((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-16">
      <PageHeader
        kicker="Trade Lab"
        title="Indicators, patterns & backtests"
        subtitle="Pick an index or F&O stock. Every number is plain maths on real exchange candles — no AI model, no simulated data. Each signal shows the exact rule that produced it."
        trust={{ source: "Upstox exchange candles, Yahoo Finance fallback", note: "Rule-based technical readings, not recommendations", delayed: "Pre-computed every 15 min in market hours" }}
      />

      <Panel title="1 · Instrument & timeframe">
        <div className="space-y-3">
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
        </div>
      </Panel>

      {watch.length ? (
        <Panel title="Watchlist" subtitle="Saved in this browser. Daily verdict from the pre-computed cache.">
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
        </Panel>
      ) : null}

      {error ? <p className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700">{error instanceof Error ? error.message : String(error)} Nothing is shown rather than a guess.</p> : null}
      {isLoading && !data ? <p className="text-sm text-muted-foreground">Loading candles for {symbol}…</p> : null}

      {data && !error ? (
        <>
          <Panel
            title={<span>{data.symbol} <span className="text-muted-foreground font-medium">· {data.tf}</span></span>}
            action={
              <div className="flex items-center gap-2">
                {fresh ? <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", fresh.cls)}>{data.stale ? "Stale — showing last good data" : fresh.text}</span> : null}
                <button type="button" onClick={() => writeWatch(watch.includes(data.symbol) ? watch.filter((w) => w !== data.symbol) : [...watch, data.symbol])} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted" aria-pressed={watch.includes(data.symbol)}>
                  {watch.includes(data.symbol) ? "★ Watching" : "☆ Watch"}
                </button>
              </div>
            }
            trust={{ source: `${data.source} (${data.yahooTicker})`, asOf: new Date(data.asOf * 1000).toISOString(), note: `${data.bars} bars · last bar ${ist(data.asOf, intraday)} IST${data.adjusted ? " · split-adjusted" : ""}` }}
          >
            <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
              <div className="text-3xl font-bold tabular-nums">{money(data.price.last)}</div>
              <div className={cn("text-lg font-semibold tabular-nums", data.price.change >= 0 ? "text-emerald-600" : "text-rose-600")}>{data.price.change >= 0 ? "+" : ""}{money(data.price.change)} ({pct(data.price.changePct, 2)}){intraday ? " vs prev close" : ""}</div>
              <div className="text-sm tabular-nums text-muted-foreground">Range {money(data.price.dayLow)} – {money(data.price.dayHigh)}{data.price.volume ? ` · Vol ${data.price.volume.toLocaleString("en-IN")}` : ""}</div>
            </div>
            <div className="mt-3"><CandleChart candles={data.candles} /></div>
          </Panel>

          <Panel title="2 · Verdict & reasons" subtitle="Each reason is one indicator or pattern with the numbers behind it.">
            <div className="space-y-3">
              <div>
                <div className={cn("text-xl font-bold", biasText[data.verdict.bias])}>{data.verdict.label}</div>
                <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="bg-emerald-500" style={{ width: `${(data.verdict.bullish / Math.max(1, data.verdict.total)) * 100}%` }} />
                  <div className="bg-muted-foreground/30" style={{ width: `${(data.verdict.neutral / Math.max(1, data.verdict.total)) * 100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${(data.verdict.bearish / Math.max(1, data.verdict.total)) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Count of indicator readings (ATR excluded — it has no direction). Bullish {data.verdict.bullish} · Neutral {data.verdict.neutral} · Bearish {data.verdict.bearish}. Agreement is not prediction.</p>
              </div>
              <ul className="divide-y divide-border">
                {data.reasons.map((r, i) => (
                  <li key={`${r.source}-${i}`} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                    <span className="font-semibold text-foreground">{r.source}</span>
                    <span className="min-w-0 flex-1 text-muted-foreground">{r.text}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", biasBadge[r.bias])}>{biasLabel[r.bias]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel title="3 · Indicators" subtitle="Tick the ones you want to see. Values are computed exactly from the candles above.">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {data.indicators.map((i) => (
                <label key={i.id} className={cn("flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs", hidden.has(i.id) ? "border-border text-muted-foreground" : "border-primary/40 bg-primary/5 text-foreground")}>
                  <input type="checkbox" checked={!hidden.has(i.id)} onChange={() => toggle(i.id)} className="accent-primary" />
                  {i.label}
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.map((i) => <IndicatorCard key={i.id} ind={i} />)}</div>
            {!data.indicators.some((i) => i.id === "mfi") ? <p className="mt-3 text-xs text-muted-foreground">Volume-based indicators (OBV, MFI, VWAP) are not shown: this instrument reports no traded volume.</p> : null}
          </Panel>

          <Panel title="4 · Patterns & levels" subtitle="Rule-based detection. The rule and numbers are shown — nothing is a black box, and no pattern is certain.">
            {data.patterns.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.patterns.map((p) => (
                  <div key={`${p.id}-${p.barsAgo}`} className="rounded-lg border border-border bg-background p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold">{p.name} <span className="text-xs font-normal text-muted-foreground">· {p.kind === "chart" ? "chart pattern" : "candlestick"}</span></div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", biasBadge[p.bias])}>{biasLabel[p.bias]}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{p.barsAgo === 0 ? "On the latest bar" : `${p.barsAgo} bar${p.barsAgo > 1 ? "s" : ""} ago`} · {ist(p.time, intraday)} · confidence: {p.confidence}</div>
                    <p className="mt-1.5 text-sm">{p.why}</p>
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
          </Panel>
        </>
      ) : null}

      <Panel title="5 · Strategy backtest" subtitle={`Test a preset on ${symbol}'s last 2 years of daily bars. Rules are fixed in advance — nothing is tuned to flatter the result.`}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STRATEGY_UI.map((s) => (
            <button key={s.id} type="button" onClick={() => setStrategy(s.id)} className={cn("rounded-lg border p-3 text-left transition-colors", strategy === s.id ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted")}>
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.blurb}</div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          {!strategy ? <p className="text-sm text-muted-foreground">Pick a strategy to run it.</p> : null}
          {btLoading ? <p className="text-sm text-muted-foreground">Running backtest…</p> : null}
          {btError ? <p className="text-sm text-rose-700">{btError instanceof Error ? btError.message : String(btError)}</p> : null}
          {bt && strategy && !btError && bt.strategy === strategy ? <BacktestView r={bt} /> : null}
        </div>
      </Panel>

      <p className="text-xs leading-5 text-muted-foreground">
        Indicator values are standard formulas (Wilder RSI/ADX/ATR, SMA-seeded EMA/MACD) and are reproducible from the candles shown. Pattern detection is rule-based and approximate — a hammer is candle geometry, but a head-and-shoulders needs judgment thresholds, which are printed on every card. Past performance does not predict future returns. Descriptive analytics only, not investment advice. See <a href="/methodology" className="underline">methodology</a>.
      </p>
    </div>
  );
}
