"use client";

import { useCallback, useEffect, useState } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import { AlgoPageHeader, AlgoStatTile } from "@/components/ai-trader/algo-desk-ui";
import { Panel } from "@/components/layout/page-header";
import Badge from "@/components/ai-trader/Badge";
import { API_BASE, fetchJSON } from "@/lib/ai-trader/api";
import { pnlClass, regimeClass, pnlFmt } from "@/lib/ai-trader/algo-brand";
import { cn } from "@/lib/utils";
import { Play, RefreshCw } from "lucide-react";

type ReplayDay = { day: string; ticks: number };

type ReplayTrade = {
  entry_time?: string;
  symbol: string;
  direction: "CALL" | "PUT";
  strategy: string;
  entry_price: number;
  exit_price?: number;
  pnl: number;
  result: string;
  ml_prob: number;
  score: number;
};

type ReplayState = {
  status: "idle" | "running" | "done" | string;
  date: string | null;
  progress: number;
  total_minutes: number;
  current_time: string | null;
  current_price: number;
  regime: string;
  trades: ReplayTrade[];
  total_pnl: number;
  ticks_processed: number;
};

const idle: ReplayState = {
  status: "idle",
  date: null,
  progress: 0,
  total_minutes: 0,
  current_time: null,
  current_price: 0,
  regime: "UNKNOWN",
  trades: [],
  total_pnl: 0,
  ticks_processed: 0,
};

export default function ReplayPage() {
  const [days, setDays] = useState<ReplayDay[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [replay, setReplay] = useState<ReplayState>(idle);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchJSON<ReplayDay[]>("/api/days")
      .then((d) => setDays(Array.isArray(d) ? d : []))
      .catch(() => setDays([]));
  }, []);

  const poll = useCallback(async () => {
    const data = await fetchJSON<ReplayState>("/api/replay/state").catch(() => idle);
    setReplay(data);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      const data = await poll();
      if (cancelled) return;
      if (data.status === "running") timer = setTimeout(loop, 500);
      else setStarting(false);
    };
    if (replay.status === "running") loop();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [replay.status, poll]);

  const startReplay = async () => {
    if (!selectedDay) return;
    setStarting(true);
    try {
      await fetch(`${API_BASE}/api/replay/start?date=${encodeURIComponent(selectedDay)}`, { method: "POST" });
      await poll();
    } catch {
      setStarting(false);
    }
  };

  const wins = replay.trades.filter((t) => t.pnl > 0).length;
  const winRate = replay.trades.length ? Math.round((wins / replay.trades.length) * 100) : null;
  const timeLabel = replay.current_time?.split(" ")[1] ?? replay.current_time ?? "—";

  return (
    <AlgoDeskShell>
      <AlgoPageHeader
        title="Tick replay simulation"
        subtitle="Fast-forward one historical session with the same ML and strategy pipeline as live trading."
        badge={<Badge label="Simulation" variant="purple" />}
      />

      <Panel title="Session setup">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="replay-day" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Select day
            </label>
            <select id="replay-day" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="mt-1 block min-w-[220px]">
              <option value="">— pick a day —</option>
              {days.map((d) => (
                <option key={d.day} value={d.day}>
                  {d.day} ({d.ticks?.toLocaleString("en-IN") ?? 0} ticks)
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!selectedDay || starting || replay.status === "running"}
            onClick={startReplay}
            className="t-btn-green inline-flex items-center gap-2 disabled:opacity-50"
          >
            {starting || replay.status === "running" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Start replay
          </button>
          <div className="min-w-[200px] flex-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="capitalize">{replay.status}</span>
              <span className="tabular-nums">{replay.progress}%</span>
            </div>
            <div className="algo-progress-track mt-2">
              <div className="algo-progress-fill" style={{ width: `${replay.progress}%` }} />
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <AlgoStatTile label="Time" value={timeLabel} valueClassName="text-primary" />
        <AlgoStatTile
          label="NIFTY"
          value={replay.current_price ? `₹${replay.current_price.toLocaleString("en-IN")}` : "—"}
          valueClassName="text-primary"
        />
        <AlgoStatTile label="Regime" value={replay.regime} valueClassName={regimeClass(replay.regime)} />
        <AlgoStatTile label="Ticks" value={replay.ticks_processed.toLocaleString("en-IN")} />
        <AlgoStatTile label="Trades" value={String(replay.trades.length)} />
        <AlgoStatTile label="Win rate" value={winRate != null ? `${winRate}%` : "—"} valueClassName="text-chart-2" />
        <AlgoStatTile label="Day P&L" value={pnlFmt(replay.total_pnl)} valueClassName={pnlClass(replay.total_pnl)} />
      </div>

      <Panel title="Replay trades" subtitle={replay.trades.length ? `${replay.trades.length} fills this run` : "Select a day and start replay"}>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Contract</th>
                <th>Dir</th>
                <th>Strategy</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>P&L</th>
                <th>Result</th>
                <th>ML</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {replay.trades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                    No trades yet
                  </td>
                </tr>
              ) : (
                [...replay.trades].reverse().map((t, i) => (
                  <tr key={`${t.symbol}-${i}`}>
                    <td className="text-muted-foreground">{t.entry_time?.split(" ")[1] ?? t.entry_time ?? ""}</td>
                    <td className="font-semibold">{t.symbol}</td>
                    <td>
                      <Badge label={t.direction} variant={t.direction === "CALL" ? "green" : "red"} />
                    </td>
                    <td>{t.strategy}</td>
                    <td className="tabular-nums">₹{t.entry_price}</td>
                    <td className="tabular-nums">{t.exit_price ?? "—"}</td>
                    <td className={cn("tabular-nums font-semibold", pnlClass(t.pnl))}>{pnlFmt(t.pnl)}</td>
                    <td>{t.result}</td>
                    <td className="tabular-nums">{(t.ml_prob * 100).toFixed(0)}%</td>
                    <td className="tabular-nums">{(t.score * 100).toFixed(0)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AlgoDeskShell>
  );
}
