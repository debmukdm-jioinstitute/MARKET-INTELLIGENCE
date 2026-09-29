"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import { AlgoPageHeader, AlgoStatTile } from "@/components/ai-trader/algo-desk-ui";
import { Panel } from "@/components/layout/page-header";
import EquityChart from "@/components/ai-trader/EquityChart";
import RiskProfileCard from "@/components/ai-trader/RiskProfileCard";
import TradeTable from "@/components/ai-trader/TradeTable";
import { LOCAL_RISK_PROFILES, type LocalRiskLevel } from "@/lib/algo-backtest/risk-profiles";
import type { LocalBacktestProfile } from "@/lib/algo-backtest/strangle-backtest";
import { pnlClass, pnlFmt, type AlgoRiskLevel } from "@/lib/ai-trader/algo-brand";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

type RiskLevel = AlgoRiskLevel;

type LocalBacktestResponse = {
  asOf: string;
  from: string;
  to: string;
  historyBars: number;
  results: Record<LocalRiskLevel, LocalBacktestProfile>;
  error?: string;
};

const riskLabelClass: Record<RiskLevel, string> = {
  low: "text-chart-1",
  medium: "text-chart-3",
  high: "text-chart-2",
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    const j = (await r.json()) as LocalBacktestResponse;
    if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
    return j;
  });

export default function BacktestPage() {
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel>("medium");
  const { data, error, isLoading, mutate, isValidating } = useSWR<LocalBacktestResponse>(
    "/api/algo/backtest-local",
    fetcher,
  );
  const load = useCallback(() => mutate(), [mutate]);

  const results = data?.results;
  const curves: Record<string, { time: string; equity: number }[]> = {};
  if (results) {
    for (const r of ["low", "medium", "high"] as RiskLevel[]) {
      const prof = results[r];
      if (prof) curves[r] = prof.trade_list.map((t, i) => ({ time: t.exit_time.slice(0, 10), equity: prof.equity_curve[i] ?? 0 }));
    }
  }
  const p = results?.[selectedRisk];

  return (
    <AlgoDeskShell>
      <AlgoPageHeader
        title="Backtest"
        subtitle="Weekly short-strangle strategy on real NIFTY 50 daily history — computed here, no external service."
        action={
          <button type="button" onClick={load} disabled={isValidating} className="t-btn inline-flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5", isValidating && "animate-spin")} /> Recompute
          </button>
        }
      />

      <Panel
        title="Methodology — read this before the numbers below"
        subtitle="This is not a claim of real trading performance. It is honest about what it is."
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Real data, modeled options.</strong> The underlying (NIFTY 50 daily closes,{" "}
            {data ? `${data.historyBars.toLocaleString("en-IN")} sessions, ${data.from} → ${data.to}` : "~5 years"}) is real, from
            the same Yahoo Finance feed used elsewhere on this site. Option premiums are <em>not</em> real historical option
            prices — none are available to this app — they're estimated with Black-Scholes from the index's own trailing
            realized volatility. Treat every ₹ figure below as a model estimate, not a trade you could have actually made.
          </li>
          <li>
            <strong className="text-foreground">Strategy.</strong> Once a week, sell one out-of-the-money call and one
            out-of-the-money put (a short strangle), each sized in standard deviations of realized volatility from spot — a
            wider distance for Conservative, closer (more premium, more risk) for Aggressive. Each leg exits independently at
            its own profit-target, stop-loss, or Thursday expiry.
          </li>
          <li>
            <strong className="text-foreground">No look-ahead, no tuning to a target.</strong> Every entry only uses
            volatility computed from days before it. Nothing here was adjusted to hit a particular win rate — see the
            Methodology note on the AI Signals page for why that would make the number meaningless.
          </li>
          <li>
            <strong className="text-foreground">Stops are checked once a day, not intraday.</strong> A large single-day move
            can carry a position past its stop-loss before this model ever sees a price in between — the exit still fires,
            but the realized loss can exceed the stated stop. This is a real, known risk of short option strategies (gap
            risk), shown honestly rather than assumed away with an intraday fill this model has no data to justify.
          </li>
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
          <RiskProfileCard
            key={r}
            level={r}
            profile={LOCAL_RISK_PROFILES[r]}
            active={selectedRisk === r}
            onSelect={setSelectedRisk}
          />
        ))}
      </div>

      {isLoading ? (
        <Panel title="Computing…" subtitle="Fetching 5 years of NIFTY history and running the strategy for all three profiles.">
          <p className="text-sm text-muted-foreground">This runs in your request — usually a few seconds.</p>
        </Panel>
      ) : null}

      {error ? (
        <Panel title="Could not compute a backtest">
          <p className="text-sm text-destructive">{error instanceof Error ? error.message : String(error)}</p>
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

          {p.trade_list.length > 0 ? (
            <Panel
              title={`Trade list · ${selectedRisk}`}
              subtitle={`${p.trade_list.length} legs. "Score" column shows the annualized realized volatility used to price that leg (this engine has no ML, so it's not a confidence score). "Regime" shows the strike distance in standard deviations.`}
            >
              <TradeTable trades={p.trade_list} />
            </Panel>
          ) : null}
        </>
      ) : null}

      {results ? (
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
                  if (!rp) return null;
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
      ) : null}
    </AlgoDeskShell>
  );
}
