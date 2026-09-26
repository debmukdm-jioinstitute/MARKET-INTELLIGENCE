"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import { AlgoPageHeader, AlgoSegmentBar, AlgoStatTile } from "@/components/ai-trader/algo-desk-ui";
import { AlgoJourneyChart } from "@/components/ai-trader/algo-journey-chart";
import { Panel } from "@/components/layout/page-header";
import Badge from "@/components/ai-trader/Badge";
import PnlBarChart from "@/components/ai-trader/PnlBarChart";
import { API_BASE, fetchJSON, type Trade, type LiveTrade, type JourneyPoint } from "@/lib/ai-trader/api";
import { toDateStr, toISTTimeFull } from "@/lib/ai-trader/time";
import { useTradingMode } from "@/components/ai-trader/contexts/TradingModeContext";
import { pnlClass, pnlFmt, riskTabClass, type AlgoRiskLevel } from "@/lib/ai-trader/algo-brand";
import { cn } from "@/lib/utils";
import { Download, Activity } from "lucide-react";

type RiskLevel = AlgoRiskLevel;
type TabMode = "backtest" | "live";
type Filter = "ALL" | "CALL" | "PUT" | "WIN" | "LOSS" | "RL_EXIT";

function LiveTradeRows({ trades }: { trades: LiveTrade[] }) {
  const [journeyId, setJourneyId] = useState<number | null>(null);
  const [journeyData, setJourneyData] = useState<{
    journey: JourneyPoint[];
    entry_premium: number;
    initial_sl: number;
    target: number;
    symbol: string;
  } | null>(null);

  const toggleJourney = (t: LiveTrade) => {
    if (journeyId === t.id) {
      setJourneyId(null);
      setJourneyData(null);
      return;
    }
    setJourneyId(t.id);
    setJourneyData({
      journey: t.journey || [],
      entry_premium: t.entry_premium,
      initial_sl: t.initial_sl,
      target: t.target,
      symbol: t.symbol,
    });
  };

  if (!trades.length) {
    return (
      <tr>
        <td colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
          No live trades
        </td>
      </tr>
    );
  }

  return (
    <>
      {trades.map((t) => {
        const pnl = t.realised_pnl ?? 0;
        const dateStr = t.entry_time_dt ? t.entry_time_dt.slice(0, 10) : "—";
        return (
          <React.Fragment key={t.id}>
            <tr>
              <td className="text-muted-foreground">{dateStr}</td>
              <td className="text-muted-foreground">{t.entry_time || "—"}</td>
              <td className="font-semibold">{t.symbol}</td>
              <td>
                <Badge label={t.direction} variant={t.direction === "CALL" ? "green" : "red"} />
              </td>
              <td className="text-muted-foreground">{t.strategy?.replace(/_/g, " ")}</td>
              <td className="tabular-nums">₹{t.entry_premium.toFixed(1)}</td>
              <td className="tabular-nums">₹{(t.exit_premium ?? t.current_premium)?.toFixed(1) ?? "—"}</td>
              <td className={cn("font-semibold tabular-nums", pnlClass(pnl))}>{pnlFmt(pnl)}</td>
              <td>
                <Badge
                  label={t.exit_reason ?? "OPEN"}
                  variant={
                    t.exit_reason === "TARGET_HIT" ? "green" : t.exit_reason === "SL_HIT" || t.exit_reason === "TRAILING_SL" ? "red" : "yellow"
                  }
                />
              </td>
              <td className="tabular-nums">{(t.final_score * 100).toFixed(0)}%</td>
              <td>
                <button type="button" onClick={() => toggleJourney(t)} className={cn("t-btn inline-flex items-center gap-1 text-xs", journeyId === t.id && "t-btn-active")}>
                  <Activity className="h-3 w-3" /> Journey
                </button>
              </td>
            </tr>
            {journeyId === t.id && journeyData ? (
              <tr>
                <td colSpan={11} className="algo-inset p-3">
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
    </>
  );
}

function BacktestTradeRows({ trades, risk }: { trades: Trade[]; risk: RiskLevel }) {
  const [journeyIdx, setJourneyIdx] = useState<number | null>(null);
  const [journeyData, setJourneyData] = useState<{
    journey: JourneyPoint[];
    entry_premium: number;
    initial_sl: number;
    target: number;
    symbol: string;
  } | null>(null);
  const [loadingJourney, setLoadingJourney] = useState(false);

  const toggleJourney = async (t: Trade, idx: number) => {
    if (journeyIdx === idx) {
      setJourneyIdx(null);
      setJourneyData(null);
      return;
    }
    setJourneyIdx(idx);
    setLoadingJourney(true);
    try {
      const data = await fetchJSON<{ journey: JourneyPoint[] }>(`/api/backtest/journey/${risk}/${idx}`);
      setJourneyData({
        journey: data.journey,
        entry_premium: t.entry_premium,
        initial_sl: t.sl,
        target: t.target,
        symbol: t.symbol,
      });
    } catch {
      setJourneyData({ journey: [], entry_premium: t.entry_premium, initial_sl: t.sl, target: t.target, symbol: t.symbol });
    } finally {
      setLoadingJourney(false);
    }
  };

  if (!trades.length) {
    return (
      <tr>
        <td colSpan={12} className="py-8 text-center text-sm text-muted-foreground">
          No trades
        </td>
      </tr>
    );
  }

  return (
    <>
      {[...trades].reverse().map((t, i) => {
        const origIdx = trades.length - 1 - i;
        return (
          <React.Fragment key={i}>
            <tr>
              <td className="text-muted-foreground">{toDateStr(String(t.entry_time))}</td>
              <td className="text-muted-foreground">{toISTTimeFull(String(t.entry_time))}</td>
              <td>{t.symbol}</td>
              <td>
                <Badge label={t.direction} variant={t.direction === "CALL" ? "green" : "red"} />
              </td>
              <td className="text-muted-foreground">{t.strategy?.replace(/_/g, " ")}</td>
              <td className="tabular-nums">₹{t.entry_premium?.toFixed(1)}</td>
              <td className="tabular-nums">₹{t.exit_premium?.toFixed(1) ?? "—"}</td>
              <td className={cn("font-semibold tabular-nums", pnlClass(t.pnl))}>{pnlFmt(t.pnl)}</td>
              <td>
                <Badge label={t.result} variant={t.result === "TARGET" ? "green" : t.result === "SL" || t.result === "TRAILING_SL" ? "red" : "yellow"} />
              </td>
              <td className="tabular-nums">{(t.final_score * 100).toFixed(0)}%</td>
              <td className="text-muted-foreground">{t.regime}</td>
              <td>
                <button type="button" onClick={() => toggleJourney(t, origIdx)} className={cn("t-btn inline-flex items-center gap-1 text-xs", journeyIdx === origIdx && "t-btn-active")}>
                  <Activity className="h-3 w-3" /> {loadingJourney && journeyIdx === origIdx ? "…" : "Journey"}
                </button>
              </td>
            </tr>
            {journeyIdx === origIdx && journeyData ? (
              <tr>
                <td colSpan={12} className="algo-inset p-3">
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
    </>
  );
}

export default function TradesPage() {
  const { mode: tradingMode } = useTradingMode();
  const [tabMode, setTabMode] = useState<TabMode>("backtest");
  const [risk, setRisk] = useState<RiskLevel>("high");
  const [filter, setFilter] = useState<Filter>("ALL");

  const [btTrades, setBtTrades] = useState<Trade[]>([]);
  const [btLoading, setBtLoading] = useState(true);
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  const loadBacktest = useCallback(async (r: RiskLevel) => {
    setBtLoading(true);
    try {
      const data = await fetchJSON<Trade[]>(`/api/trades/history?risk=${r}`);
      setBtTrades(Array.isArray(data) ? data : []);
    } finally {
      setBtLoading(false);
    }
  }, []);

  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    try {
      const data = await fetchJSON<LiveTrade[]>(`/api/paper/trades?mode=${tradingMode}`);
      setLiveTrades(Array.isArray(data) ? data : []);
    } finally {
      setLiveLoading(false);
    }
  }, [tradingMode]);

  useEffect(() => {
    loadBacktest(risk);
  }, [risk, loadBacktest]);
  useEffect(() => {
    if (tabMode === "live") loadLive();
  }, [tabMode, loadLive]);

  const filteredBt = btTrades.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "CALL" || filter === "PUT") return t.direction === filter;
    if (filter === "WIN") return t.pnl > 0;
    if (filter === "LOSS") return t.pnl <= 0;
    if (filter === "RL_EXIT") return t.result === "RL_EXIT" || t.result === "DQN_EXIT";
    return true;
  });

  const filteredLive = liveTrades.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "CALL" || filter === "PUT") return t.direction === filter;
    if (filter === "WIN") return (t.realised_pnl ?? 0) > 0;
    if (filter === "LOSS") return (t.realised_pnl ?? 0) <= 0;
    return true;
  });

  const activeCount = tabMode === "backtest" ? filteredBt.length : filteredLive.length;
  const totalPnl =
    tabMode === "backtest"
      ? filteredBt.reduce((s, t) => s + t.pnl, 0)
      : filteredLive.reduce((s, t) => s + (t.realised_pnl ?? 0), 0);
  const wins =
    tabMode === "backtest"
      ? filteredBt.filter((t) => t.pnl > 0).length
      : filteredLive.filter((t) => (t.realised_pnl ?? 0) > 0).length;
  const losses = activeCount - wins;
  const winRate = activeCount > 0 ? (wins / activeCount) * 100 : null;

  const strategies = Array.from(new Set(btTrades.map((t) => t.strategy)));
  const byStrategy = strategies.map((s) => ({
    strategy: s,
    trades: btTrades.filter((t) => t.strategy === s).length,
    pnl: btTrades.filter((t) => t.strategy === s).reduce((sum, t) => sum + t.pnl, 0),
    wr:
      btTrades.filter((t) => t.strategy === s).length > 0
        ? (btTrades.filter((t) => t.strategy === s && t.pnl > 0).length / btTrades.filter((t) => t.strategy === s).length) * 100
        : 0,
  }));

  const isLoading = tabMode === "backtest" ? btLoading : liveLoading;
  const filterOptions: { id: Filter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "CALL", label: "Call" },
    { id: "PUT", label: "Put" },
    { id: "WIN", label: "Win" },
    { id: "LOSS", label: "Loss" },
    ...(tabMode === "backtest" ? [{ id: "RL_EXIT" as Filter, label: "RL exit" }] : []),
  ];

  return (
    <AlgoDeskShell>
      <AlgoPageHeader
        title="Trade history"
        subtitle={tabMode === "backtest" ? "Completed trades from tick replay backtests." : `Live paper trades · ${tradingMode} mode`}
        action={
          <a
            href={
              tabMode === "backtest"
                ? `${API_BASE}/api/trades/history?risk=${risk}`
                : `${API_BASE}/api/paper/trades?mode=${tradingMode}`
            }
            download={tabMode === "backtest" ? `bt_trades_${risk}.json` : `live_trades_${tradingMode}.json`}
            className="t-btn inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </a>
        }
      />

      <AlgoSegmentBar
        options={[
          { id: "backtest" as TabMode, label: "Backtest" },
          { id: "live" as TabMode, label: "Live trades" },
        ]}
        value={tabMode}
        onChange={setTabMode}
      />

      {tabMode === "backtest" ? (
        <div className="flex flex-wrap gap-2">
          {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
            <button key={r} type="button" onClick={() => setRisk(r)} className={riskTabClass(r, risk === r)}>
              {r} risk
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <AlgoStatTile label="Total trades" value={activeCount} />
        <AlgoStatTile label="Total P&L" value={pnlFmt(totalPnl)} valueClassName={pnlClass(totalPnl)} />
        <AlgoStatTile label="Win rate" value={winRate != null ? `${winRate.toFixed(1)}%` : "—"} />
        <AlgoStatTile label="Winners" value={wins} valueClassName="text-chart-2" />
        <AlgoStatTile label="Losers" value={losses} valueClassName="text-destructive" />
      </div>

      <AlgoSegmentBar options={filterOptions} value={filter} onChange={setFilter} />

      {tabMode === "backtest" && filteredBt.length > 0 ? (
        <Panel title="Per-trade P&L">
          <PnlBarChart trades={filteredBt} />
        </Panel>
      ) : null}

      {tabMode === "backtest" && byStrategy.length > 0 ? (
        <Panel title="Strategy breakdown">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {["Strategy", "Trades", "P&L", "Win rate"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byStrategy.map((s) => (
                  <tr key={s.strategy}>
                    <td>{s.strategy?.replace(/_/g, " ")}</td>
                    <td>{s.trades}</td>
                    <td className={cn("font-semibold tabular-nums", pnlClass(s.pnl))}>{pnlFmt(s.pnl)}</td>
                    <td>{s.wr.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel
        title={tabMode === "backtest" ? `Backtest trades${filter !== "ALL" ? ` · ${filter}` : ""}` : "Live paper trades"}
        subtitle={`${tabMode === "backtest" ? filteredBt.length : filteredLive.length} records`}
        action={
          tabMode === "live" ? (
            <button type="button" onClick={loadLive} className="t-btn text-xs">
              Refresh
            </button>
          ) : undefined
        }
      >
        {isLoading ? (
          <p className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading…</p>
        ) : tabMode === "backtest" ? (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {["Date", "Time", "Symbol", "Dir", "Strategy", "Entry", "Exit", "P&L", "Result", "Score", "Regime", ""].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <BacktestTradeRows trades={filteredBt} risk={risk} />
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {["Date", "Time", "Symbol", "Dir", "Strategy", "Entry", "Exit", "P&L", "Reason", "Score", ""].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <LiveTradeRows trades={filteredLive} />
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AlgoDeskShell>
  );
}
