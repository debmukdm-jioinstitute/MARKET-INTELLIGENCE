"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import { AlgoPageHeader } from "@/components/ai-trader/algo-desk-ui";
import { Panel } from "@/components/layout/page-header";
import Badge from "@/components/ai-trader/Badge";
import { AlgoJourneyChart } from "@/components/ai-trader/algo-journey-chart";
import {
  fetchJSON,
  postJSON,
  enterPaperTrade,
  exitPaperTrade,
  clearClosedPositions,
  setAutoTrade,
  SSE_STREAM_URL,
  API_BASE,
  type LiveState,
  type TradeSuggestion,
  type PaperPosition,
  type StreamPayload,
} from "@/lib/ai-trader/api";
import { pnlClass, regimeClass, pnlFmt } from "@/lib/ai-trader/algo-brand";
import { cn } from "@/lib/utils";
import { RefreshCw, Zap, TrendingUp, TrendingDown, X, Trash2, Radio, Bot, Hand, Activity } from "lucide-react";
import { useTradingMode } from "@/components/ai-trader/contexts/TradingModeContext";

type JourneyPoint = {
  ts: string;
  option_price: number;
  nifty_price: number;
  sl: number;
  unrealised_pnl: number;
};
type JourneyData = {
  id: number;
  symbol: string;
  direction: string;
  entry_premium: number;
  initial_sl: number;
  target: number;
  status: string;
  journey: JourneyPoint[];
};

function riskVariant(label: string | null | undefined): "green" | "yellow" | "red" | "gray" {
  if (label === "LOW") return "green";
  if (label === "MEDIUM") return "yellow";
  if (label === "HIGH") return "red";
  return "gray";
}

function exitReasonVariant(reason?: string | null): "green" | "red" | "yellow" {
  if (reason === "TARGET_HIT") return "green";
  if (reason === "SL_HIT") return "red";
  if (reason === "TRAILING_SL") return "yellow";
  return "yellow";
}

export default function LivePage() {
  const { mode } = useTradingMode();
  const [state, setState] = useState<LiveState | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("--");
  const [positionsByMode, setPositionsByMode] = useState<{ test: PaperPosition[]; live: PaperPosition[] }>({
    test: [],
    live: [],
  });
  const [pnlByMode, setPnlByMode] = useState<Record<string, { open: number; closed: number; total: number }>>({
    test: { open: 0, closed: 0, total: 0 },
    live: { open: 0, closed: 0, total: 0 },
  });
  const [autoTrade, setAutoTradeState] = useState<boolean>(true);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [entering, setEntering] = useState<string | null>(null);
  const [exiting, setExiting] = useState<number | null>(null);
  const [enterError, setEnterError] = useState<string | null>(null);
  const [tickCacheAge, setTickCacheAge] = useState<number | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; ts: string }>>({});
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const [brokerStatus, setBrokerStatus] = useState<{
    connected?: boolean;
    broker?: string;
    mode?: string;
    halted?: boolean;
    halt_reason?: string;
    daily_pnl?: number;
    trade_count?: number;
    max_daily_loss?: number;
    confirmation_mode?: string;
    pending_signals?: Array<{
      symbol: string;
      direction: string;
      strategy: string;
      final_score?: number;
    }>;
  } | null>(null);

  const fetchBrokerStatus = useCallback(() => {
    fetchJSON<typeof brokerStatus>("/api/broker/status").then(setBrokerStatus).catch(() => {});
  }, []);

  useEffect(() => {
    fetchBrokerStatus();
    const iv = setInterval(fetchBrokerStatus, 10_000);
    return () => clearInterval(iv);
  }, [fetchBrokerStatus]);

  useEffect(() => {
    const es = new EventSource(SSE_STREAM_URL);
    esRef.current = es;

    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    es.onmessage = (event) => {
      try {
        const d: StreamPayload = JSON.parse(event.data);
        if (d.state) {
          setState(
            (prev) =>
              ({
                ...(prev ?? ({} as LiveState)),
                ...d.state,
              }) as LiveState,
          );
          setLastUpdate(new Date().toLocaleTimeString("en-IN"));
          if (d.state.auto_trade_enabled !== undefined) {
            setAutoTradeState(d.state.auto_trade_enabled);
          }
        }
        if (d.positions_by_mode) setPositionsByMode(d.positions_by_mode);
        if (d.tick_cache) setLivePrices(d.tick_cache);
        if (d.tick_cache_age !== undefined) setTickCacheAge(d.tick_cache_age);
        setPnlByMode({
          test: {
            open: d.total_open_pnl_test ?? 0,
            closed: d.total_closed_pnl_test ?? 0,
            total: d.total_pnl_test ?? 0,
          },
          live: {
            open: d.total_open_pnl_live ?? 0,
            closed: d.total_closed_pnl_live ?? 0,
            total: d.total_pnl_live ?? 0,
          },
        });
      } catch {
        /* ignore malformed SSE payloads */
      }
    };

    fetchJSON<LiveState>("/api/state")
      .then((d) => {
        if (d) setState(d);
      })
      .catch(() => {});

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const positions = positionsByMode[mode] ?? [];
  const totalOpenPnl = pnlByMode[mode]?.open ?? 0;
  const totalClosedPnl = pnlByMode[mode]?.closed ?? 0;
  const totalPnl = pnlByMode[mode]?.total ?? 0;

  const triggerScan = async () => {
    setScanning(true);
    try {
      await postJSON("/api/scan");
    } finally {
      setScanning(false);
    }
  };

  const handleToggleAutoTrade = async () => {
    setTogglingAuto(true);
    try {
      const res = await setAutoTrade(!autoTrade);
      setAutoTradeState(res.auto_trade_enabled);
    } finally {
      setTogglingAuto(false);
    }
  };

  const handleEnter = async (t: TradeSuggestion) => {
    setEntering(t.symbol + t.direction);
    setEnterError(null);
    try {
      await enterPaperTrade(t, mode);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setEnterError(msg.includes("Could not determine") ? "No live premium data for this contract yet" : msg);
    } finally {
      setEntering(null);
    }
  };

  const handleExit = async (id: number) => {
    setExiting(id);
    try {
      await exitPaperTrade(id, mode);
    } finally {
      setExiting(null);
    }
  };

  const handleClear = async () => {
    await clearClosedPositions(mode);
  };

  const openPositions = positions.filter((p) => p.status === "OPEN");
  const closedPositions = positions.filter((p) => p.status === "CLOSED");

  const [journeyId, setJourneyId] = useState<number | null>(null);
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const journeyInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchJourney = async (id: number) => {
    try {
      const data = await fetchJSON(`/api/paper/journey/${id}`);
      setJourneyData(data as JourneyData);
    } catch {
      /* silent */
    }
  };

  const toggleJourney = (id: number) => {
    if (journeyId === id) {
      setJourneyId(null);
      setJourneyData(null);
      if (journeyInterval.current) clearInterval(journeyInterval.current);
    } else {
      setJourneyId(id);
      fetchJourney(id);
      if (journeyInterval.current) clearInterval(journeyInterval.current);
      journeyInterval.current = setInterval(() => fetchJourney(id), 5000);
    }
  };

  useEffect(
    () => () => {
      if (journeyInterval.current) clearInterval(journeyInterval.current);
    },
    [],
  );

  const futPrice = state?.last_price ?? null;

  return (
    <AlgoDeskShell>
      <div className="space-y-4">
        <AlgoPageHeader
          title="Live trading"
          subtitle={
            mode === "live"
              ? "Live mode — real Zerodha executions."
              : "Test mode — simulated paper orders."
          }
          badge={mode === "live" ? <Badge label="Live" variant="red" /> : <Badge label="Test" variant="blue" />}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium",
                  sseConnected ? "text-chart-2" : "text-destructive",
                )}
              >
                <Radio className="h-3.5 w-3.5" aria-hidden />
                {sseConnected ? "Live stream" : "Reconnecting…"}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{lastUpdate}</span>
              <button
                type="button"
                onClick={handleToggleAutoTrade}
                disabled={togglingAuto}
                className={cn(
                  "t-btn inline-flex items-center gap-1.5 text-xs disabled:opacity-50",
                  autoTrade
                    ? "border-chart-2/35 bg-chart-2/10 text-chart-2"
                    : "border-primary/35 bg-primary/10 text-primary",
                )}
              >
                {autoTrade ? <Bot className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
                {autoTrade ? "Auto" : "Manual"}
              </button>
              <button
                type="button"
                onClick={triggerScan}
                disabled={scanning}
                className="t-btn inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
              >
                {scanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                {scanning ? "Scanning…" : "Scan now"}
              </button>
            </div>
          }
        />

        <Panel title="Status">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">System status</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    state?.status === "scanning" ? "bg-chart-2 t-pulse" : "bg-chart-3",
                  )}
                />
                <span className="text-sm font-semibold capitalize text-foreground">{state?.status ?? "…"}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                NIFTY <span className="normal-case text-muted-foreground/80">· futures</span>
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-primary">
                {futPrice ? `₹${futPrice.toLocaleString("en-IN", { maximumFractionDigits: 1 })}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Market regime</p>
              <p className={cn("mt-1 text-xl font-bold capitalize", regimeClass(state?.regime))}>
                {state?.regime ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Session P&L</p>
              <p className={cn("mt-1 text-xl font-bold tabular-nums", pnlClass(totalPnl))}>{pnlFmt(totalPnl)}</p>
            </div>
          </div>
        </Panel>

        {openPositions.length > 0 ? (
          <Panel
            title={`Open positions (${openPositions.length})`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {tickCacheAge !== null && tickCacheAge < 30 ? (
                  <Badge label={`Tick live · ${tickCacheAge.toFixed(0)}s`} variant="green" />
                ) : (
                  <Badge label="REST ~1 min" variant="yellow" />
                )}
                <span className={cn("text-sm font-semibold tabular-nums", pnlClass(totalOpenPnl))}>
                  Unrealised: {pnlFmt(totalOpenPnl)}
                </span>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {[
                      "Time",
                      "Contract",
                      "Dir",
                      "Entry ₹",
                      "Current ₹",
                      "SL ₹",
                      "Target ₹",
                      "Lots",
                      "Unrealised P&L",
                      "",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((p) => {
                    const tickEntry = livePrices[p.symbol];
                    const currentPrem =
                      tickEntry && tickCacheAge !== null && tickCacheAge < 30 ? tickEntry.price : p.current_premium;
                    const unrealisedPnl = Math.round((currentPrem - p.entry_premium) * p.lot_size - 40);
                    const pct = ((currentPrem - p.entry_premium) / p.entry_premium) * 100;
                    const slPct = ((p.sl - p.entry_premium) / p.entry_premium) * 100;
                    const tgtPct = ((p.target - p.entry_premium) / p.entry_premium) * 100;
                    const breakeven = (p as PaperPosition & { breakeven_locked?: boolean }).breakeven_locked;
                    return (
                      <React.Fragment key={p.id}>
                        <tr>
                          <td className="text-muted-foreground">{p.entry_time}</td>
                          <td className="font-semibold">{p.symbol}</td>
                          <td>
                            <Badge label={p.direction} variant={p.direction === "CALL" ? "green" : "red"} />
                          </td>
                          <td className="tabular-nums">₹{p.entry_premium}</td>
                          <td className={cn("font-semibold tabular-nums", pnlClass(unrealisedPnl))}>
                            ₹{currentPrem.toFixed(1)}
                            <span className="ml-1 text-xs">
                              ({pct >= 0 ? "+" : ""}
                              {pct.toFixed(1)}%)
                            </span>
                          </td>
                          <td
                            className={cn(
                              "tabular-nums",
                              p.trailing_active
                                ? "text-chart-3"
                                : breakeven
                                  ? "text-primary"
                                  : "text-destructive",
                            )}
                          >
                            ₹{p.sl}
                            <span className="text-xs"> ({slPct.toFixed(0)}%)</span>
                            {p.trailing_active ? (
                              <Badge label="Trail" variant="yellow" />
                            ) : breakeven ? (
                              <Badge label="BE" variant="blue" />
                            ) : null}
                          </td>
                          <td className="tabular-nums text-chart-2">
                            ₹{p.target} <span className="text-xs">(+{tgtPct.toFixed(0)}%)</span>
                          </td>
                          <td
                            className={cn(
                              "tabular-nums",
                              p.lot_size > 65 ? "font-bold text-chart-3" : "text-muted-foreground",
                            )}
                          >
                            {Math.round(p.lot_size / 65)}×
                          </td>
                          <td className={cn("font-bold tabular-nums", pnlClass(unrealisedPnl))}>
                            {pnlFmt(unrealisedPnl)}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => toggleJourney(p.id)}
                                className={cn(
                                  "t-btn inline-flex items-center gap-1 px-2 py-0.5 text-xs",
                                  journeyId === p.id && "t-btn-active",
                                )}
                                title="View trade journey chart"
                              >
                                <Activity className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExit(p.id)}
                                disabled={exiting === p.id}
                                className="t-btn-red inline-flex items-center gap-1 px-2 py-0.5 text-xs disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                                {exiting === p.id ? "…" : "Exit"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {journeyId === p.id && journeyData ? (
                          <tr>
                            <td colSpan={10} className="algo-inset p-3">
                              {journeyData.status === "OPEN" ? (
                                <p className="mb-2 text-xs text-chart-3">Live — refreshing every 5s</p>
                              ) : null}
                              <AlgoJourneyChart
                                journey={journeyData.journey}
                                entryPremium={journeyData.entry_premium}
                                initialSl={journeyData.initial_sl}
                                target={journeyData.target}
                                symbol={journeyData.symbol}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}

        <Panel
          title="Trade suggestions"
          subtitle="Auto-refresh 3s · 5 min cooldown per signal"
          action={
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                autoTrade
                  ? "border-chart-2/35 bg-chart-2/10 text-chart-2"
                  : "border-primary/35 bg-primary/10 text-primary",
              )}
            >
              {autoTrade ? (
                <>
                  <Bot className="h-3 w-3" /> Auto trading
                </>
              ) : (
                <>
                  <Hand className="h-3 w-3" /> Manual
                </>
              )}
            </span>
          }
        >
          {enterError ? (
            <div className="mb-3 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {enterError}
            </div>
          ) : null}
          {!state?.trade_suggestions?.length ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No signals — scanning every 30s</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Signals appear when the model finds high-probability setups
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {[
                      "Time",
                      "Contract",
                      "Dir",
                      "Strategy",
                      "Risk",
                      "Entry ₹",
                      "SL ₹",
                      "Target ₹",
                      "Lots",
                      "Expiry",
                      "ML%",
                      "Score",
                      "Regime",
                      "",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...state.trade_suggestions].reverse().map((t, i) => {
                    const key = t.symbol + t.direction;
                    const isEntering = entering === key;
                    return (
                      <tr key={i}>
                        <td className="text-muted-foreground">{t.time}</td>
                        <td className="font-semibold">{t.symbol}</td>
                        <td>
                          <Badge label={t.direction} variant={t.direction === "CALL" ? "green" : "red"} />
                        </td>
                        <td className="text-muted-foreground">{t.strategy?.replace(/_/g, " ")}</td>
                        <td>
                          <Badge label={t.risk_label ?? "—"} variant={riskVariant(t.risk_label)} />
                        </td>
                        <td className="tabular-nums">{t.entry_premium ? `₹${t.entry_premium}` : "—"}</td>
                        <td className="tabular-nums text-destructive">{t.sl_price ? `₹${t.sl_price}` : "—"}</td>
                        <td className="tabular-nums text-chart-2">{t.target_price ? `₹${t.target_price}` : "—"}</td>
                        <td
                          className={cn(
                            "tabular-nums",
                            t.lots && t.lots > 1 ? "font-bold text-chart-3" : "text-muted-foreground",
                          )}
                        >
                          {t.lots ?? 1}×
                        </td>
                        <td className="text-muted-foreground">
                          {t.expiry} ({t.dte}d)
                        </td>
                        <td className="tabular-nums">{(t.ml_prob * 100).toFixed(0)}%</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${t.final_score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums">{(t.final_score * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="text-muted-foreground">{t.regime}</td>
                        <td>
                          {autoTrade ? (
                            <Badge label="Auto" variant="green" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEnter(t)}
                              disabled={isEntering}
                              className="t-btn-green inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-xs disabled:opacity-50"
                            >
                              {t.direction === "CALL" ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {isEntering ? "…" : "Enter"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {closedPositions.length > 0 ? (
          <Panel
            title={`Closed positions (${closedPositions.length})`}
            action={
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("text-sm font-semibold tabular-nums", pnlClass(totalClosedPnl))}>
                  Realised: {pnlFmt(totalClosedPnl)}
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="t-btn inline-flex items-center gap-1 px-2 py-0.5 text-xs"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {["Entry", "Exit", "Contract", "Dir", "Entry ₹", "Exit ₹", "Realised P&L", "Reason"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...closedPositions].reverse().map((p) => {
                    const pnl = p.realised_pnl ?? 0;
                    return (
                      <tr key={p.id}>
                        <td className="text-muted-foreground">{p.entry_time}</td>
                        <td className="text-muted-foreground">{p.exit_time}</td>
                        <td className="font-semibold">{p.symbol}</td>
                        <td>
                          <Badge label={p.direction} variant={p.direction === "CALL" ? "green" : "red"} />
                        </td>
                        <td className="tabular-nums">₹{p.entry_premium}</td>
                        <td className="tabular-nums">₹{p.exit_premium}</td>
                        <td className={cn("font-bold tabular-nums", pnlClass(pnl))}>{pnlFmt(pnl)}</td>
                        <td>
                          <Badge
                            label={p.exit_reason?.replace(/_/g, " ") ?? "—"}
                            variant={exitReasonVariant(p.exit_reason)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}

        <Panel
          title="Broker execution"
          className={brokerStatus?.halted ? "border-destructive/40" : undefined}
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetch(`${API_BASE}/api/broker/kill`, { method: "POST" }).then(() => fetchBrokerStatus())}
                className="t-btn-red text-xs"
              >
                Kill switch
              </button>
              {brokerStatus?.halted ? (
                <button
                  type="button"
                  onClick={() =>
                    fetch(`${API_BASE}/api/broker/resume`, { method: "POST" }).then(() => fetchBrokerStatus())
                  }
                  className="t-btn-green text-xs"
                >
                  Resume
                </button>
              ) : null}
            </div>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Badge
              label={`${brokerStatus?.broker ?? "?"} ${brokerStatus?.connected ? "Connected" : "Disconnected"}`}
              variant={brokerStatus?.connected ? "green" : "red"}
            />
            <Badge label={`Mode: ${brokerStatus?.mode?.toUpperCase() ?? "PAPER"}`} variant="blue" />
            <Badge
              label={
                brokerStatus?.halted ? `Halted: ${brokerStatus.halt_reason}` : "Active"
              }
              variant={brokerStatus?.halted ? "red" : "gray"}
            />
            <Badge
              label={`Broker P&L: ${pnlFmt(brokerStatus?.daily_pnl ?? 0)}`}
              variant={(brokerStatus?.daily_pnl ?? 0) >= 0 ? "green" : "red"}
            />
            <Badge
              label={`Trades: ${brokerStatus?.trade_count ?? 0} · Max loss: ₹${brokerStatus?.max_daily_loss ?? 0}`}
              variant="gray"
            />
            <Badge
              label={`Confirm: ${brokerStatus?.confirmation_mode?.toUpperCase() ?? "AUTO"}`}
              variant="gray"
            />
          </div>
          {(brokerStatus?.pending_signals?.length ?? 0) > 0 ? (
            <div className="algo-inset mt-3 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-chart-3">
                Pending signals ({brokerStatus!.pending_signals!.length})
              </p>
              {brokerStatus!.pending_signals!.map((sig, i) => (
                <div key={i} className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">
                    {sig.symbol} {sig.direction} — {sig.strategy} (score {sig.final_score?.toFixed(2)})
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        fetch(`${API_BASE}/api/broker/confirm`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ index: i }),
                        }).then(() => fetchBrokerStatus())
                      }
                      className="t-btn-green px-2 py-0.5 text-xs"
                    >
                      Execute
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        fetch(`${API_BASE}/api/broker/reject`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ index: i }),
                        }).then(() => fetchBrokerStatus())
                      }
                      className="t-btn-red px-2 py-0.5 text-xs"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title="Model status">
          <div className="flex flex-wrap gap-2">
            <Badge label={`ML ${state?.models_loaded ? "loaded" : "not loaded"}`} variant={state?.models_loaded ? "green" : "red"} />
            <Badge label={`DB ${state?.db_connected ? "OK" : "down"}`} variant={state?.db_connected ? "green" : "red"} />
            {state?.strategy_models_loaded?.map((s) => (
              <Badge key={s} label={s} variant="blue" />
            ))}
            <Badge label={`Scans: ${state?.scan_count ?? 0}`} variant="gray" />
            <Badge label={`Last: ${state?.last_scan ?? "—"}`} variant="gray" />
          </div>
        </Panel>
      </div>
    </AlgoDeskShell>
  );
}
