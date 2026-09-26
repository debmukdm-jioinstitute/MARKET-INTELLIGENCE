"use client";

import { useEffect, useState } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import Badge from "@/components/ai-trader/Badge";
import {
  fetchJSON,
  SSE_STREAM_URL,
  type Candle,
  type BacktestResults,
  type CandleDateInfo,
  type OptionChainRow,
  type OptionTickData,
} from "@/lib/ai-trader/api";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import RetroCalendar from "@/components/ai-trader/RetroCalendar";
import { AlgoPageHeader } from "@/components/ai-trader/algo-desk-ui";
import { Panel } from "@/components/layout/page-header";
import { ALGO_CHART } from "@/lib/ai-trader/algo-brand";
import { cn } from "@/lib/utils";
import { toISTTime as toIST_HM, toISTTimeFull as toIST_HMS } from "@/lib/ai-trader/time";

/* ── helpers ─────────────────────────────────────────────────────────── */

const pnlFmt = (v: number) =>
  `₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const TIP = ALGO_CHART.tooltip;
const AXIS = { fill: ALGO_CHART.axisFill, fontSize: 9 };
const GRID = ALGO_CHART.grid;

/* ── sub-components ──────────────────────────────────────────────────── */

function NiftyCandleChart({ candles }: { candles: Candle[] }) {
  if (!candles.length)
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No candle data</div>;

  const data = candles.map(c => ({
    t: toIST_HM(String(c.timestamp)),
    open: c.open, high: c.high, low: c.low, close: c.close,
    vol: c.volume,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="t" tick={AXIS} interval={14} />
        <YAxis yAxisId="price" tick={AXIS} domain={["auto", "auto"]} width={65}
          tickFormatter={v => `₹${v.toLocaleString("en-IN")}`} />
        <YAxis yAxisId="vol" orientation="right" tick={AXIS} width={40} />
        <Tooltip contentStyle={TIP}
          formatter={(v: any, name: any) => [
            name === "Volume" ? Number(v).toLocaleString() : `₹${Number(v).toLocaleString("en-IN")}`, name,
          ]} />
        <Bar yAxisId="vol" dataKey="vol" fill={ALGO_CHART.line.muted} opacity={0.35} name="Volume" />
        <Line yAxisId="price" type="monotone" dataKey="close" stroke={ALGO_CHART.line.primary} dot={false} strokeWidth={1.5} name="Close" />
        <Line yAxisId="price" type="monotone" dataKey="high" stroke={ALGO_CHART.line.up} dot={false} strokeWidth={1} strokeDasharray="2 2" name="High" />
        <Line yAxisId="price" type="monotone" dataKey="low" stroke={ALGO_CHART.line.down} dot={false} strokeWidth={1} strokeDasharray="2 2" name="Low" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function OptionTickChart({ tickData, symbol }: { tickData: OptionTickData; symbol: string }) {
  if (!tickData.data.length)
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tick data for {symbol}</div>;

  const isTick = tickData.source === "ticks";
  const data = tickData.data.map((d: Record<string, unknown>) => ({
    t:   toIST_HMS(String(d.timestamp ?? "")),
    ltp: Number(isTick ? d.price : d.close) || 0,
    vol: Number(d.volume) || 0,
    oi:  Number(d.oi) || 0,
    bid: isTick ? Number(d.bid_price) || 0 : undefined,
    ask: isTick ? Number(d.ask_price) || 0 : undefined,
  }));

  const maxPts = 2000;
  const sampled = data.length > maxPts
    ? data.filter((_, i) => i % Math.ceil(data.length / maxPts) === 0)
    : data;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-muted-foreground">
          {tickData.data.length.toLocaleString()} {isTick ? "ticks" : "candles"}
          {data.length > maxPts && ` (sampled to ${sampled.length} pts)`}
        </span>
        <Badge label={isTick ? "TICK" : "1-MIN"} variant={isTick ? "green" : "blue"} />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={sampled} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="t" tick={AXIS} interval={Math.max(1, Math.floor(sampled.length / 15))} />
          <YAxis yAxisId="price" tick={AXIS} domain={["auto", "auto"]} width={55}
            tickFormatter={v => `₹${v}`} />
          <YAxis yAxisId="oi" orientation="right" tick={AXIS} width={50} />
          <Tooltip contentStyle={TIP}
            formatter={(v: any, name: any) => [
              name === "OI" ? Number(v).toLocaleString() : `₹${Number(v).toFixed(2)}`, name,
            ]} />
          <Area yAxisId="oi" type="monotone" dataKey="oi" fill={ALGO_CHART.line.muted} fillOpacity={0.25} stroke={ALGO_CHART.line.muted} name="OI" />
          <Line yAxisId="price" type="monotone" dataKey="ltp" stroke={ALGO_CHART.line.primary} dot={false} strokeWidth={1.5} name="LTP" />
          {isTick && (
            <>
              <Line yAxisId="price" type="monotone" dataKey="bid" stroke={ALGO_CHART.line.up} dot={false} strokeWidth={1} strokeDasharray="2 2" name="Bid" />
              <Line yAxisId="price" type="monotone" dataKey="ask" stroke={ALGO_CHART.line.down} dot={false} strokeWidth={1} strokeDasharray="2 2" name="Ask" />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function OptionChainTable({
  chain,
  selectedSymbol,
  onSelect,
}: {
  chain: OptionChainRow[];
  selectedSymbol: string | null;
  onSelect: (sym: string) => void;
}) {
  if (!chain.length)
    return <div className="py-8 text-center text-sm text-muted-foreground">No option chain data</div>;

  const strikes = Array.from(new Set(chain.map(r => r.strike))).sort((a, b) => a - b);
  const ceMap = new Map(chain.filter(r => r.type === "CE").map(r => [r.strike, r]));
  const peMap = new Map(chain.filter(r => r.type === "PE").map(r => [r.strike, r]));

  return (
    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
      <table className="text-[11px]">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th colSpan={4} className="border-r border-border text-center text-chart-2">CALL (CE)</th>
            <th className="text-center text-chart-3">Strike</th>
            <th colSpan={4} className="border-l border-border text-center text-destructive">PUT (PE)</th>
          </tr>
          <tr>
            {["OI", "Vol", "LTP", ""].map(h => (
              <th key={`ce-${h}`} className="text-right">{h}</th>
            ))}
            <th className="text-center">₹</th>
            {["", "LTP", "Vol", "OI"].map(h => (
              <th key={`pe-${h}`} className="text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {strikes.map(strike => {
            const ce = ceMap.get(strike);
            const pe = peMap.get(strike);
            const ceSym = ce?.symbol ?? "";
            const peSym = pe?.symbol ?? "";
            const isCeSelected = selectedSymbol === ceSym;
            const isPeSelected = selectedSymbol === peSym;

            return (
              <tr key={strike}>
                <td className="text-right text-muted-foreground">{ce ? ce.oi.toLocaleString() : "-"}</td>
                <td className="text-right text-muted-foreground">{ce ? ce.volume.toLocaleString() : "-"}</td>
                <td className="text-right font-semibold text-chart-2">{ce ? `₹${ce.last_price.toFixed(2)}` : "-"}</td>
                <td className="px-1 text-right">
                  {ce && (
                    <button
                      type="button"
                      onClick={() => onSelect(ceSym)}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-all",
                        isCeSelected ? "border-chart-2 bg-chart-2 text-primary-foreground" : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      CE
                    </button>
                  )}
                </td>
                <td className="bg-muted text-center font-bold text-chart-3">{strike}</td>
                <td className="px-1 text-left">
                  {pe && (
                    <button
                      type="button"
                      onClick={() => onSelect(peSym)}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-all",
                        isPeSelected ? "border-destructive bg-destructive text-primary-foreground" : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      PE
                    </button>
                  )}
                </td>
                <td className="text-left font-semibold text-destructive">{pe ? `₹${pe.last_price.toFixed(2)}` : "-"}</td>
                <td className="text-left text-muted-foreground">{pe ? pe.volume.toLocaleString() : "-"}</td>
                <td className="text-left text-muted-foreground">{pe ? pe.oi.toLocaleString() : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsCharts({ results }: { results: BacktestResults }) {
  const profiles = ["low", "medium", "high"] as const;
  const winData = profiles.map(r => ({
    name: r.charAt(0).toUpperCase() + r.slice(1),
    win_rate: results[r]?.win_rate ?? 0,
    loss_rate: results[r] ? 100 - results[r]!.win_rate : 0,
  }));
  const ddData = profiles.map(r => ({
    name: r.charAt(0).toUpperCase() + r.slice(1),
    drawdown: Math.abs(results[r]?.max_dd ?? 0),
    pnl: results[r]?.pnl ?? 0,
  }));
  const rrData = profiles.map(r => ({
    name: r.charAt(0).toUpperCase() + r.slice(1),
    rr: results[r]?.rr ?? 0,
    avg_win: results[r]?.avg_win ?? 0,
    avg_loss: Math.abs(results[r]?.avg_loss ?? 0),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px]">
      <div className="t-panel p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Win rate</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={winData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="name" tick={AXIS} />
            <YAxis tick={AXIS} domain={[0, 100]} tickFormatter={v => `${v}%`} width={40} />
            <Tooltip contentStyle={TIP} formatter={(v: any, name: any) => [`${v}%`, name === "win_rate" ? "Win" : "Loss"]} />
            <ReferenceLine y={50} stroke={ALGO_CHART.grid} strokeDasharray="4 4" />
            <Bar dataKey="win_rate" fill={ALGO_CHART.line.up} name="win_rate" />
            <Bar dataKey="loss_rate" fill={ALGO_CHART.line.down} name="loss_rate" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="t-panel p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">P&L vs max DD</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={ddData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="name" tick={AXIS} />
            <YAxis tick={AXIS} width={60} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={TIP} formatter={(v: any, name: any) => [pnlFmt(name === "drawdown" ? -Number(v) : Number(v)), name === "drawdown" ? "Max DD" : "P&L"]} />
            <Bar dataKey="pnl" fill={ALGO_CHART.line.up} name="pnl" />
            <Bar dataKey="drawdown" fill={ALGO_CHART.line.down} name="drawdown" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="t-panel p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg W/L & R:R</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={rrData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="name" tick={AXIS} />
            <YAxis yAxisId="money" tick={AXIS} width={60} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="rr" orientation="right" tick={AXIS} width={30} />
            <Tooltip contentStyle={TIP} formatter={(v: any, name: any) => [name === "rr" ? `${v}×` : pnlFmt(Number(v)), name === "rr" ? "R:R" : name === "avg_win" ? "Avg Win" : "Avg Loss"]} />
            <ReferenceLine yAxisId="money" y={0} stroke={ALGO_CHART.grid} />
            <Bar yAxisId="money" dataKey="avg_win" fill={ALGO_CHART.line.up} name="avg_win" />
            <Bar yAxisId="money" dataKey="avg_loss" fill={ALGO_CHART.line.down} name="avg_loss" />
            <Line yAxisId="rr" type="monotone" dataKey="rr" stroke={ALGO_CHART.line.primary} strokeWidth={2} dot={{ fill: ALGO_CHART.line.primary, r: 3 }} name="rr" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────────── */

interface TickPoint { timestamp: string; price: number; volume: number; bid_price?: number; ask_price?: number; }

export default function ChartsPage() {
  const [dates, setDates] = useState<CandleDateInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [chartView, setChartView] = useState<"candles" | "ticks">("candles");
  const [ticks, setTicks] = useState<TickPoint[]>([]);
  const [loadingTicks2, setLoadingTicks2] = useState(false);

  const [expiries, setExpiries] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [chain, setChain] = useState<OptionChainRow[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [optionTicks, setOptionTicks] = useState<OptionTickData | null>(null);
  const [loadingTicks, setLoadingTicks] = useState(false);

  const [results, setResults] = useState<BacktestResults>({});

  // ── Live option-chain prices from SSE (today only) ────────────────────
  // Overlays tick_cache prices onto the chain state every ~1s so the
  // option chain table updates live without refresh. Only connects the
  // EventSource when selectedDate === today.
  // ── Live option chain updates (today only) ───────────────────────────
  // Two separate mechanisms:
  //   1. SSE stream → live LTP prices (every ~1s, zero cost — same stream
  //      that the live page uses, just reads tick_cache from the payload)
  //   2. Periodic fetchJSON → OI + volume (every 30s via /api/options/chain,
  //      which is a single DB query — OI/vol don't change faster than that)

  // 1. SSE for live prices
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (selectedDate !== today) return;

    const es = new EventSource(SSE_STREAM_URL);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const cache = data.tick_cache as Record<string, { price: number }> | undefined;
        if (!cache) return;
        setChain((prev) => {
          if (prev.length === 0) return prev;
          let changed = false;
          const updated = prev.map((row) => {
            const live = cache[row.symbol];
            if (live && live.price > 0 && Math.abs(live.price - row.last_price) > 0.01) {
              changed = true;
              return { ...row, last_price: live.price };
            }
            return row;
          });
          return changed ? updated : prev;
        });
      } catch {}
    };
    return () => es.close();
  }, [selectedDate]);

  // 2. Periodic OI + volume refresh (every 30s)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (selectedDate !== today || !selectedExpiry) return;

    const refresh = () => {
      fetchJSON<OptionChainRow[]>(`/api/options/chain?date=${selectedDate}&expiry=${selectedExpiry}`)
        .then((rows) => {
          const freshMap = new Map(rows.map(r => [r.symbol, r]));
          setChain((prev) => {
            if (prev.length === 0) return prev;
            let changed = false;
            const updated = prev.map((row) => {
              const fresh = freshMap.get(row.symbol);
              if (fresh && (fresh.volume !== row.volume || fresh.oi !== row.oi)) {
                changed = true;
                return { ...row, volume: fresh.volume, oi: fresh.oi };
              }
              return row;
            });
            return changed ? updated : prev;
          });
        })
        .catch(() => {});
    };

    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [selectedDate, selectedExpiry]);

  // Current date info for toggle visibility
  const currentDateInfo = dates.find(d => d.day === selectedDate);
  const hasBothViews = (currentDateInfo?.bars ?? 0) > 0 && (currentDateInfo?.ticks ?? 0) > 0;

  useEffect(() => {
    fetchJSON<CandleDateInfo[]>("/api/candle_dates").then(d => {
      setDates(d);
      if (d.length > 0) setSelectedDate(d[d.length - 1].day);
    }).catch(() => {});
    fetchJSON<BacktestResults>("/api/backtest/results").then(setResults).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingCandles(true);
    setChain([]);
    setSelectedExpiry("");
    setSelectedOption(null);
    setOptionTicks(null);
    setTicks([]);
    setChartView("candles");

    Promise.all([
      fetchJSON<Candle[]>(`/api/market/candles/date?date=${selectedDate}`).catch(() => []),
      fetchJSON<string[]>(`/api/options/expiries?date=${selectedDate}`).catch(() => []),
    ]).then(([c, e]) => {
      setCandles(c);
      setExpiries(e);
      if (e.length > 0) setSelectedExpiry(e[0]);
      setLoadingCandles(false);
      // If no candles but ticks exist, auto-switch to tick view
      if (c.length === 0) {
        const info = dates.find(d => d.day === selectedDate);
        if (info && info.ticks > 0) setChartView("ticks");
      }
    });
  }, [selectedDate, dates]);

  // Load tick data when user switches to tick view
  useEffect(() => {
    if (chartView !== "ticks" || !selectedDate) return;
    if (ticks.length > 0) return; // already loaded
    setLoadingTicks2(true);
    fetchJSON<TickPoint[]>(`/api/market/ticks/date?date=${selectedDate}`)
      .then(setTicks)
      .catch(() => setTicks([]))
      .finally(() => setLoadingTicks2(false));
  }, [chartView, selectedDate, ticks.length]);

  useEffect(() => {
    if (!selectedDate || !selectedExpiry) return;
    setLoadingChain(true);
    setSelectedOption(null);
    setOptionTicks(null);
    fetchJSON<OptionChainRow[]>(`/api/options/chain?date=${selectedDate}&expiry=${selectedExpiry}`)
      .then(setChain)
      .catch(() => setChain([]))
      .finally(() => setLoadingChain(false));
  }, [selectedDate, selectedExpiry]);

  useEffect(() => {
    if (!selectedOption || !selectedDate) return;
    setLoadingTicks(true);
    fetchJSON<OptionTickData>(`/api/options/ticks?symbol=${selectedOption}&date=${selectedDate}`)
      .then(setOptionTicks)
      .catch(() => setOptionTicks(null))
      .finally(() => setLoadingTicks(false));
  }, [selectedOption, selectedDate]);

  const parseSymbol = (sym: string) => {
    const m = sym.match(/NIFTY(\d{6})(\d+)(CE|PE)/);
    if (!m) return sym;
    return `NIFTY ${m[2]} ${m[3]}`;
  };

  return (
    <AlgoDeskShell>
      <AlgoPageHeader
        title="Charts"
        subtitle="Market data, option chains, and tick charts."
        action={<RetroCalendar dates={dates} selectedDate={selectedDate} onSelect={setSelectedDate} />}
      />

      <Panel
        title={`NIFTY ${chartView === "candles" ? "1-min" : "ticks"} · ${selectedDate || "…"}`}
        subtitle={chartView === "candles" ? `${candles.length} candles` : `${ticks.length} ticks`}
        action={
          hasBothViews ? (
            <div className="flex gap-2">
              {(["candles", "ticks"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setChartView(v)}
                  className={cn("algo-segment text-xs", chartView === v && "algo-segment-active")}
                >
                  {v === "candles" ? `1-min (${currentDateInfo?.bars ?? 0})` : `Ticks (${currentDateInfo?.ticks ?? 0})`}
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
          {loadingCandles || loadingTicks2 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : chartView === "candles" ? (
            <NiftyCandleChart candles={candles} />
          ) : ticks.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={ticks.filter((_, i) => i % Math.max(1, Math.floor(ticks.length / 2000)) === 0)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={AXIS} tickFormatter={(t) => toIST_HMS(t ?? "")} />
                <YAxis domain={["auto", "auto"]} tick={AXIS} />
                <Tooltip contentStyle={TIP} labelStyle={{ fontSize: 9 }} itemStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="price" stroke={ALGO_CHART.line.up} strokeWidth={1} dot={false} name="Price" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">No tick data</div>
          )}
      </Panel>

      <Panel
        title="Option chain"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Expiry</span>
            {expiries.length > 0 ? (
              <select value={selectedExpiry} onChange={(e) => setSelectedExpiry(e.target.value)}>
                {expiries.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-muted-foreground">None</span>
            )}
            {chain.length > 0 ? <span className="text-xs text-muted-foreground">{chain.length} contracts</span> : null}
          </div>
        }
      >
        {loadingChain ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <OptionChainTable chain={chain} selectedSymbol={selectedOption} onSelect={setSelectedOption} />
        )}
      </Panel>

      {selectedOption ? (
        <Panel
          title={parseSymbol(selectedOption)}
          subtitle={selectedOption}
          action={
            <button
              type="button"
              onClick={() => {
                setSelectedOption(null);
                setOptionTicks(null);
              }}
              className="t-btn text-xs"
            >
              Close
            </button>
          }
        >
          {loadingTicks ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : optionTicks ? (
            <OptionTickChart tickData={optionTicks} symbol={selectedOption} />
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </Panel>
      ) : null}

      <Panel title="Backtest analytics">
        <AnalyticsCharts results={results} />
      </Panel>
    </AlgoDeskShell>
  );
}
