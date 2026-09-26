"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import { AlgoPageHeader, AlgoStatTile } from "@/components/ai-trader/algo-desk-ui";
import { Panel } from "@/components/layout/page-header";
import EquityChart from "@/components/ai-trader/EquityChart";
import RiskProfileCard from "@/components/ai-trader/RiskProfileCard";
import TradeTable from "@/components/ai-trader/TradeTable";
import { fetchJSON, postJSON, type BacktestResults, type RiskProfile, type EquityCurvePoint } from "@/lib/ai-trader/api";
import { pnlClass, pnlFmt, riskActiveBg, type AlgoRiskLevel } from "@/lib/ai-trader/algo-brand";
import { cn } from "@/lib/utils";
import { Play, RefreshCw, Terminal, Calendar } from "lucide-react";

type RiskLevel = AlgoRiskLevel;

interface BacktestProgress {
  running: boolean;
  risk: string | null;
  status: string;
  output_lines: string[];
  started?: string;
  finished?: string;
  exit_code?: number;
  start_date?: string | null;
  end_date?: string | null;
}

interface AvailableDay {
  day: string;
  ticks: number;
}

const riskLabelClass: Record<RiskLevel, string> = {
  low: "text-chart-1",
  medium: "text-chart-3",
  high: "text-chart-2",
};

export default function BacktestPage() {
  const [results, setResults] = useState<BacktestResults>({});
  const [curves, setCurves] = useState<Record<string, EquityCurvePoint[]>>({});
  const [profiles, setProfiles] = useState<Record<RiskLevel, RiskProfile> | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel>("medium");
  const [progress, setProgress] = useState<BacktestProgress | null>(null);
  const termRef = useRef<HTMLDivElement>(null);

  const [availDays, setAvailDays] = useState<AvailableDay[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const datesInitRef = useRef(false);
  const load = useCallback(async () => {
    try {
      const [r, c, p, days] = await Promise.all([
        fetchJSON<BacktestResults>("/api/backtest/results").catch(() => ({})),
        fetchJSON<Record<string, EquityCurvePoint[]>>("/api/equity/curve").catch(() => ({})),
        fetchJSON<Record<RiskLevel, RiskProfile>>("/api/risk/profiles").catch(() => null),
        fetchJSON<AvailableDay[]>("/api/days").catch(() => []),
      ]);
      setResults(r);
      setCurves(c);
      if (p) setProfiles(p as Record<RiskLevel, RiskProfile>);
      if (days.length > 0) {
        setAvailDays(days);
        if (!datesInitRef.current) {
          datesInitRef.current = true;
          setStartDate(String(days[0].day));
          setEndDate(String(days[days.length - 1].day));
        }
      }
    } catch {
      /* keep prior state */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const poll = async () => {
      const p = await fetchJSON<BacktestProgress>("/api/backtest/progress").catch(() => null);
      if (p) {
        setProgress(p);
        if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
        if (!p.running && p.status === "done") load();
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [load]);

  const runBacktest = async (risk: RiskLevel) => {
    try {
      const body: Record<string, string> = { risk };
      if (startDate) body.start_date = startDate;
      if (endDate) body.end_date = endDate;
      const res = await postJSON<{ status?: string; error?: string }>("/api/backtest/run", body);
      if (res.error) {
        setProgress((prev) =>
          prev ? { ...prev, output_lines: [...(prev.output_lines || []), `ERROR: ${res.error}`] } : null,
        );
      }
    } catch {
      /* progress poll picks up */
    }
  };

  const isRunning = progress?.running === true;
  const p = results[selectedRisk];

  const daysInRange = availDays.filter((d) => {
    const ds = String(d.day);
    return (!startDate || ds >= startDate) && (!endDate || ds <= endDate);
  }).length;

  return (
    <AlgoDeskShell>
      <AlgoPageHeader
        title="Backtest"
        subtitle="Run and compare tick replay across risk profiles."
        action={
          <button type="button" onClick={load} className="t-btn inline-flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <Panel title="Date range">
        <div className="flex flex-wrap items-center gap-4">
          <Calendar className="h-4 w-4 text-primary" aria-hidden />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium uppercase text-muted-foreground">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium uppercase text-muted-foreground">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <span className="text-xs text-muted-foreground">
            {daysInRange} tick-data days in range
            {availDays.length > 0 ? ` / ${availDays.length} total` : ""}
          </span>
          {availDays.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setStartDate(String(availDays[0].day));
                setEndDate(String(availDays[availDays.length - 1].day));
              }}
              className="t-btn text-xs"
            >
              All dates
            </button>
          ) : null}
        </div>
      </Panel>

      {profiles ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
            <div key={r} className="space-y-2">
              <RiskProfileCard level={r} profile={profiles[r]} active={selectedRisk === r} onSelect={setSelectedRisk} />
              <button
                type="button"
                onClick={() => runBacktest(r)}
                disabled={isRunning}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50",
                  isRunning && progress?.risk === r ? "bg-muted text-muted-foreground" : riskActiveBg(r),
                  !(isRunning && progress?.risk === r) && (r === "medium" ? "text-foreground" : "text-primary-foreground"),
                  isRunning && progress?.risk !== r && "opacity-40",
                )}
              >
                {isRunning && progress?.risk === r ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Running…
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Run {r}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {progress && progress.status !== "idle" ? (
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5" />
              Backtest {progress.risk?.toUpperCase()} — {progress.status}
            </span>
          }
          subtitle={
            <span className="text-xs">
              {progress.started ? `Started ${progress.started}` : null}
              {progress.finished ? ` · Finished ${progress.finished}` : null}
            </span>
          }
        >
          <div
            ref={termRef}
            className="algo-inset max-h-[200px] overflow-y-auto p-3 text-xs tabular-nums leading-relaxed"
          >
            {progress.output_lines.length === 0 ? (
              <span className="text-muted-foreground">Waiting for output…</span>
            ) : (
              progress.output_lines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    line.includes("ERROR") && "text-destructive",
                    line.includes("WARN") && "text-chart-3",
                    (line.includes("✓") || line.includes("done") || line.includes("Done")) && "text-chart-2",
                    !line.includes("ERROR") && !line.includes("WARN") && !line.includes("✓") && "text-muted-foreground",
                  )}
                >
                  <span className="mr-2 text-muted-foreground/70">{String(i + 1).padStart(3, " ")}</span>
                  {line}
                </div>
              ))
            )}
          </div>
        </Panel>
      ) : null}

      {p ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Total P&L", value: pnlFmt(p.pnl), cls: pnlClass(p.pnl) },
              { label: "Win rate", value: `${p.win_rate}%` },
              { label: "Risk-reward", value: `${p.rr}×`, cls: "text-primary" },
              { label: "Total trades", value: p.trades },
              { label: "Avg winner", value: pnlFmt(p.avg_win), cls: "text-chart-2" },
              { label: "Avg loser", value: pnlFmt(p.avg_loss), cls: "text-destructive" },
              { label: "Max drawdown", value: pnlFmt(p.max_dd), cls: "text-destructive" },
              { label: "Avg / trade", value: pnlFmt(p.pnl / Math.max(p.trades, 1)), cls: pnlClass(p.pnl) },
            ].map(({ label, value, cls }) => (
              <AlgoStatTile key={label} label={label} value={value} valueClassName={cls} />
            ))}
          </div>

          <Panel title={`Equity curve · ${selectedRisk}`}>
            <EquityChart curves={curves} selected={selectedRisk} />
          </Panel>

          {p.trade_list && p.trade_list.length > 0 ? (
            <Panel title={`Trade list · ${selectedRisk}`} subtitle={`${p.trade_list.length} trades`}>
              <TradeTable trades={p.trade_list} />
            </Panel>
          ) : null}
        </>
      ) : (
        <Panel title="No results yet" subtitle={`Run a backtest for ${selectedRisk} risk to populate metrics.`}>
          <p className="text-sm text-muted-foreground">Use the run buttons on the risk cards above.</p>
        </Panel>
      )}

      <Panel title="All profiles — comparison">
        <EquityChart curves={curves} selected="all" />
        <div className="mt-4 overflow-x-auto">
          <table>
            <thead>
              <tr>
                {["Profile", "Trades", "P&L", "Win rate", "R:R", "Max DD", "Avg/trade"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["low", "medium", "high"] as RiskLevel[]).map((r) => {
                const rp = results[r];
                if (!rp) {
                  return (
                    <tr key={r}>
                      <td className={cn("font-semibold uppercase", riskLabelClass[r])}>{r}</td>
                      <td colSpan={6} className="text-muted-foreground">
                        No data
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={r} className={selectedRisk === r ? "bg-muted/60" : undefined}>
                    <td className={cn("font-semibold uppercase", riskLabelClass[r])}>{r}</td>
                    <td>{rp.trades}</td>
                    <td className={cn("font-semibold tabular-nums", pnlClass(rp.pnl))}>{pnlFmt(rp.pnl)}</td>
                    <td>{rp.win_rate}%</td>
                    <td>{rp.rr}×</td>
                    <td className="text-destructive tabular-nums">{pnlFmt(rp.max_dd)}</td>
                    <td className="tabular-nums">{pnlFmt(rp.pnl / Math.max(rp.trades, 1))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </AlgoDeskShell>
  );
}
