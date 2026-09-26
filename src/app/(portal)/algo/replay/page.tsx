"use client";

import { useCallback, useEffect, useState } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import Badge from "@/components/ai-trader/Badge";
import { API_BASE, fetchJSON } from "@/lib/ai-trader/api";
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
  const regimeColor = replay.regime.includes("BULL") ? "#00e87b" : replay.regime.includes("BEAR") ? "#ff3e3e" : "#e8c300";

  return (
    <AlgoDeskShell>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#00e87b" }}>
              Tick replay simulation
            </h1>
            <p className="text-[10px] mt-0.5" style={{ color: "#3d4450" }}>
              Fast-forward one historical session with the same ML + strategy pipeline as live (AI-trader)
            </p>
          </div>
          <span className="t-badge" style={{ borderColor: "#a371f7", color: "#a371f7", background: "#1a1028" }}>
            Simulation
          </span>
        </div>

        <div className="t-panel p-4 mb-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="replay-day" className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6270" }}>
              Select day
            </label>
            <select
              id="replay-day"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="mt-1 block min-w-[220px] text-[11px]"
            >
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
            className="t-btn-green flex items-center gap-2 px-4 py-2 disabled:opacity-50"
          >
            {starting || replay.status === "running" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Start replay
          </button>
          <div className="min-w-[200px] flex-1">
            <div className="flex justify-between text-[10px]" style={{ color: "#5a6270" }}>
              <span>{replay.status}</span>
              <span className="tabular-nums">{replay.progress}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full" style={{ background: "#21262d" }}>
              <div className="h-full transition-all" style={{ width: `${replay.progress}%`, background: "#4da6ff" }} />
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-[1px] md:grid-cols-4 xl:grid-cols-7">
          {[
            { k: "Time", v: timeLabel, c: "#4da6ff" },
            { k: "NIFTY", v: replay.current_price ? `₹${replay.current_price.toLocaleString("en-IN")}` : "—", c: "#4da6ff" },
            { k: "Regime", v: replay.regime, c: regimeColor },
            { k: "Ticks", v: replay.ticks_processed.toLocaleString("en-IN"), c: "#c8cdd5" },
            { k: "Trades", v: String(replay.trades.length), c: "#c8cdd5" },
            { k: "Win rate", v: winRate != null ? `${winRate}%` : "—", c: "#00e87b" },
            {
              k: "Day P&L",
              v: `₹${replay.total_pnl.toLocaleString("en-IN")}`,
              c: replay.total_pnl >= 0 ? "#00e87b" : "#ff3e3e",
            },
          ].map(({ k, v, c }) => (
            <div key={k} className="t-panel p-3">
              <p className="text-[9px] uppercase tracking-wider" style={{ color: "#5a6270" }}>
                {k}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums" style={{ color: c }}>
                {v}
              </p>
            </div>
          ))}
        </div>

        <div className="t-panel overflow-x-auto p-3">
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
                  <td colSpan={10} className="py-6 text-center text-[11px]" style={{ color: "#484f58" }}>
                    Select a day and start replay
                  </td>
                </tr>
              ) : (
                [...replay.trades].reverse().map((t, i) => (
                  <tr key={`${t.symbol}-${i}`}>
                    <td style={{ color: "#5a6270" }}>{t.entry_time?.split(" ")[1] ?? t.entry_time ?? ""}</td>
                    <td className="font-semibold">{t.symbol}</td>
                    <td>
                      <Badge label={t.direction} variant={t.direction === "CALL" ? "green" : "red"} />
                    </td>
                    <td>{t.strategy}</td>
                    <td className="tabular-nums">₹{t.entry_price}</td>
                    <td className="tabular-nums">{t.exit_price ?? "—"}</td>
                    <td className="tabular-nums" style={{ color: t.pnl >= 0 ? "#00e87b" : "#ff3e3e", fontWeight: 700 }}>
                      ₹{t.pnl}
                    </td>
                    <td>{t.result}</td>
                    <td className="tabular-nums">{(t.ml_prob * 100).toFixed(0)}%</td>
                    <td className="tabular-nums">{(t.score * 100).toFixed(0)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </AlgoDeskShell>
  );
}
