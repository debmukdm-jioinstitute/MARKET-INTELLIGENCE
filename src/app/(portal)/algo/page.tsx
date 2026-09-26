"use client";

import { useEffect, useState, useCallback } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import { Panel } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import StatCard from "@/components/ai-trader/StatCard";
import EquityChart from "@/components/ai-trader/EquityChart";
import TradeTable from "@/components/ai-trader/TradeTable";
import PnlBarChart from "@/components/ai-trader/PnlBarChart";
import { fetchJSON, type BacktestResults, type LiveState, type EquityCurvePoint } from "@/lib/ai-trader/api";
import { RefreshCw } from "lucide-react";

const pnlFmt = (v: number) =>
  `₹${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Home() {
  const [live, setLive] = useState<LiveState | null>(null);
  const [results, setResults] = useState<BacktestResults>({});
  const [curves, setCurves] = useState<Record<string, EquityCurvePoint[]>>({});
  const [activeRisk, setActiveRisk] = useState<"low" | "medium" | "high">("high");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("--");

  const load = useCallback(async () => {
    try {
      const [liveData, backtestData, curveData] = await Promise.all([
        fetchJSON<LiveState>("/api/state").catch(() => null),
        fetchJSON<BacktestResults>("/api/backtest/results").catch(() => ({})),
        fetchJSON<Record<string, EquityCurvePoint[]>>("/api/equity/curve").catch(() => ({})),
      ]);
      if (liveData) setLive(liveData);
      setResults(backtestData);
      setCurves(curveData);
      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const p = results[activeRisk];

  const riskColors: Record<string, string> = { low: "var(--chart-1)", medium: "var(--chart-3)", high: "var(--chart-2)" };
  const riskBg: Record<string, string> = { low: "bg-chart-1", medium: "bg-chart-3", high: "bg-chart-2" };

  return (
    <AlgoDeskShell>
        <div className="ticker-bar flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                live?.status === "scanning" ? "bg-chart-2 t-pulse" : live?.status === "idle" ? "bg-primary" : "bg-muted-foreground",
              )}
            />
            <span className="text-xs font-medium uppercase text-muted-foreground">{live?.status ?? "…"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">NIFTY </span>
            <span className="text-sm font-bold tabular-nums text-chart-2">
              {live?.last_price ? `₹${live.last_price.toLocaleString("en-IN", { maximumFractionDigits: 1 })}` : "—"}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Regime </span>
            <span
              className={cn(
                "text-sm font-semibold",
                live?.regime?.includes("BULL") ? "text-chart-2" : live?.regime?.includes("BEAR") ? "text-destructive" : "text-chart-3",
              )}
            >
              {live?.regime ?? "—"}
            </span>
          </div>
          <div className="text-sm tabular-nums">
            <span className="text-muted-foreground">Scans </span>
            {live?.scan_count ?? 0}
          </div>
          <div className="text-sm tabular-nums">
            <span className="text-muted-foreground">Signals </span>
            {live?.signals_checked ?? 0}
          </div>
          <div className="text-sm tabular-nums">
            <span className="text-muted-foreground">Trades </span>
            <span className="font-semibold text-chart-2">{live?.trades_today ?? 0}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{lastRefresh}</span>
            <button type="button" onClick={load} className="t-btn inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

          <div className="flex flex-wrap gap-2">
            {(["low", "medium", "high"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRisk(r)}
                data-active={activeRisk === r}
                className={cn("algo-risk-tab capitalize", activeRisk === r && riskBg[r])}
                style={activeRisk === r ? { background: riskColors[r] } : undefined}
              >
                {r} risk
              </button>
            ))}
          </div>

          {/* KPI cards */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="t-panel p-3 h-16 animate-pulse" />
              ))}
            </div>
          ) : p ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Total P&L" value={pnlFmt(p.pnl)} color={p.pnl >= 0 ? "green" : "red"} />
              <StatCard label="Win Rate" value={`${p.win_rate}%`} color={p.win_rate >= 55 ? "green" : p.win_rate >= 45 ? "yellow" : "red"} />
              <StatCard label="Total Trades" value={p.trades} sub={`${(p.pnl / Math.max(p.trades, 1)).toFixed(0)} avg/trade`} />
              <StatCard label="Risk-Reward" value={`${p.rr}×`} color={p.rr >= 1.5 ? "green" : p.rr >= 1.0 ? "yellow" : "red"} />
              <StatCard label="Avg Winner" value={pnlFmt(p.avg_win)} color="green" />
              <StatCard label="Avg Loser" value={pnlFmt(p.avg_loss)} color="red" />
              <StatCard label="Max Drawdown" value={pnlFmt(p.max_dd)} color="red" />
              <StatCard label="Profit Factor" value={p.avg_loss !== 0 ? (p.avg_win / Math.abs(p.avg_loss)).toFixed(2) : "∞"} color="blue" />
            </div>
          ) : (
            <Panel title="No backtest data yet" subtitle={`Run tick replay for ${activeRisk} risk on the backend.`}>
              <code className="text-sm text-primary">python scripts/tick_replay_backtest.py --risk {activeRisk}</code>
            </Panel>
          )}

          {/* Charts row */}
          <div className="bento-grid-cols-2">
            <Panel title="Equity curves">
              <EquityChart curves={curves} selected="all" />
            </Panel>
            <Panel title={`Per-trade P&L · ${activeRisk}`}>
              {p?.trade_list ? (
                <PnlBarChart trades={p.trade_list} />
              ) : (
                <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data</p>
              )}
            </Panel>
          </div>

          <Panel title="Risk profile comparison">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {["Profile", "Trades", "Total P&L", "Win Rate", "R:R", "Avg/Trade", "Max DD"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["low", "medium", "high"] as const).map(r => {
                    const rp = results[r];
                    if (!rp) return null;
                    return (
                      <tr key={r} className={activeRisk === r ? "bg-muted/60" : undefined}>
                        <td>
                          <span className="font-semibold capitalize text-primary">{r}</span>
                        </td>
                        <td>{rp.trades}</td>
                        <td className={cn("font-semibold tabular-nums", rp.pnl >= 0 ? "text-chart-2" : "text-destructive")}>{pnlFmt(rp.pnl)}</td>
                        <td>{rp.win_rate}%</td>
                        <td>{rp.rr}×</td>
                        <td>{pnlFmt(rp.pnl / Math.max(rp.trades, 1))}</td>
                        <td className="text-destructive tabular-nums">{pnlFmt(rp.max_dd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title={`Recent trades · ${activeRisk}`}
            action={
              <a href="/algo/trades" className="text-sm font-medium text-primary hover:underline">
                View all
              </a>
            }
          >
            {p?.trade_list ? (
              <TradeTable trades={p.trade_list} maxRows={10} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No trades</p>
            )}
          </Panel>
    </AlgoDeskShell>
  );
}
