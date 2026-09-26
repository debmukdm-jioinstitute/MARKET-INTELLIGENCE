"use client";

import { useEffect, useState, useCallback } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import { AlgoPageHeader } from "@/components/ai-trader/algo-desk-ui";
import { Panel } from "@/components/layout/page-header";
import { BrokerSettingsPanel } from "@/components/ai-trader/broker-settings-panel";
import RiskProfileCard from "@/components/ai-trader/RiskProfileCard";
import { fetchJSON, postJSON, type RiskProfile } from "@/lib/ai-trader/api";
import { riskActiveBg, type AlgoRiskLevel } from "@/lib/ai-trader/algo-brand";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

type RiskLevel = AlgoRiskLevel;

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<Record<RiskLevel, RiskProfile> | null>(null);
  const [activeRisk, setActiveRisk] = useState<RiskLevel>("medium");
  const [runMsg, setRunMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const p = await fetchJSON<Record<RiskLevel, RiskProfile>>("/api/risk/profiles").catch(() => null);
    if (p) setProfiles(p as Record<RiskLevel, RiskProfile>);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runBacktest = async () => {
    setRunMsg(null);
    try {
      await postJSON("/api/backtest/run", { risk: activeRisk });
      setRunMsg({ type: "ok", text: `${activeRisk.toUpperCase()} backtest started` });
    } catch {
      setRunMsg({ type: "err", text: "Failed to start backtest" });
    }
  };

  return (
    <AlgoDeskShell>
      <AlgoPageHeader title="Settings" subtitle="Risk profiles, broker execution, and system configuration." />

      <Panel title="Risk profile" subtitle="Controls lot size, stop-loss, targets, max trades, and premium caps.">
        {profiles ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
              <RiskProfileCard key={r} level={r} profile={profiles[r]} active={activeRisk === r} onSelect={setActiveRisk} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading profiles…</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runBacktest}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide",
              riskActiveBg(activeRisk),
              activeRisk === "medium" ? "text-foreground" : "text-primary-foreground",
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Run {activeRisk} backtest
          </button>
          {runMsg ? (
            <span className={cn("text-sm", runMsg.type === "ok" ? "text-chart-2" : "text-destructive")}>{runMsg.text}</span>
          ) : null}
        </div>
      </Panel>

      <BrokerSettingsPanel />

      <Panel title="System info">
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          {[
            { label: "Portal proxy", value: "/api/ai-trader → AI_TRADER_API_URL" },
            { label: "Full backend", value: "services/ai-trader · python backend/app.py" },
            { label: "Database", value: "PostgreSQL (local)" },
            { label: "Index symbol", value: "NIFTY-I (TrueData)" },
            { label: "Data range", value: "Sep 2025 – Mar 2026" },
            { label: "Option format", value: "NIFTY+YYMMDD+STRIKE+CE/PE" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="algo-status-dot mt-2 bg-chart-2" />
              <div>
                <p className="text-muted-foreground">{label}</p>
                <p className="font-semibold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="CLI reference">
        <div className="space-y-3">
          {[
            { cmd: "python scripts/tick_replay_backtest.py --risk high", desc: "Full backtest HIGH" },
            { cmd: "python scripts/forward_test.py --risk medium", desc: "OOS forward test" },
            { cmd: "python scripts/train_rl_exit.py --epochs 15", desc: "Train tabular RL" },
            { cmd: "python scripts/train_dqn_exit.py --epochs 10", desc: "Train DQN agent" },
            { cmd: "python scripts/paper_trade.py --replay 2026-03-20", desc: "Replay paper trade" },
            { cmd: "python scripts/paper_trade.py", desc: "Live paper trading" },
            { cmd: "python backend/app.py", desc: "Flask API (5050)" },
            { cmd: "./scripts/start-ai-trader-backend.sh", desc: "Stub or full backend + docs" },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
              <code className="algo-code flex-1">{cmd}</code>
              <span className="text-xs text-muted-foreground sm:w-36 sm:shrink-0">{desc}</span>
            </div>
          ))}
        </div>
      </Panel>
    </AlgoDeskShell>
  );
}
