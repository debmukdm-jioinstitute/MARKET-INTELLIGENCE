"use client";

import { useEffect, useState, useCallback } from "react";
import { AlgoDeskShell } from "@/components/ai-trader/algo-desk-shell";
import { AlgoPageHeader } from "@/components/ai-trader/algo-desk-ui";
import { Panel } from "@/components/layout/page-header";
import { fetchJSON, type RLStatus } from "@/lib/ai-trader/api";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={cn("algo-status-dot", ok ? "bg-chart-2" : "bg-destructive")} aria-hidden />;
}

export default function AIPage() {
  const [rl, setRl] = useState<RLStatus>({});

  const load = useCallback(async () => {
    const data = await fetchJSON<RLStatus>("/api/rl/status").catch(() => ({}));
    setRl(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AlgoDeskShell>
      <AlgoPageHeader
        title="AI models"
        subtitle="ML models, reinforcement-learning agents, and training status."
        action={
          <button type="button" onClick={load} className="t-btn inline-flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Tabular Q-learning" subtitle="models/saved/rl_exit_agent.pkl">
          <div className="mb-4 flex items-start justify-between gap-2">
            <StatusDot ok={Boolean(rl.tabular)} />
          </div>
          {rl.tabular ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ["States", rl.tabular.states?.toLocaleString() ?? "—"],
                ["Episodes", rl.tabular.episodes?.toLocaleString() ?? "—"],
                ["Actions", "HOLD / EXIT / TIGHTEN"],
                ["Type", "Tabular Q-table"],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <span className="text-muted-foreground">{k}</span>
                  <p className="font-semibold text-foreground">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not loaded — <code className="algo-code">python scripts/train_rl_exit.py --epochs 10</code>
            </p>
          )}
          <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Last known results</p>
            <p className="mt-1">Trained on 247,234 episodes · 124 days · 11,606 states</p>
            <p>
              Eval: <span className="text-chart-2">88.1% win rate</span>, <span className="text-chart-2">+1.01% avg P&L</span>
            </p>
            <p>
              Backtest: <span className="text-chart-2">100% RL_EXIT win rate</span>
            </p>
          </div>
        </Panel>

        <Panel title="DQN agent" subtitle="models/saved/dqn_exit_agent.pt">
          <div className="mb-4 flex items-start justify-between gap-2">
            <StatusDot ok={Boolean(rl.dqn)} />
          </div>
          {rl.dqn ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ["Episodes", rl.dqn.episodes?.toLocaleString() ?? "—"],
                ["Training steps", rl.dqn.training_steps?.toLocaleString() ?? "—"],
                ["Epsilon", rl.dqn.epsilon?.toFixed(4) ?? "—"],
                ["Parameters", rl.dqn.params?.toLocaleString() ?? "—"],
                ["Architecture", "64→64→32 LayerNorm"],
                ["Algorithm", "Double DQN + Huber"],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <span className="text-muted-foreground">{k}</span>
                  <p className="font-semibold text-foreground">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not loaded — <code className="algo-code">python scripts/train_dqn_exit.py --epochs 10</code>
            </p>
          )}
          <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Advantages over tabular</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Continuous states — no discretization</li>
              <li>Double DQN — reduces overestimation</li>
              <li>Replay buffer — 50K stable training</li>
              <li>Generalizes to unseen regimes</li>
            </ul>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            title: "Macro ML model",
            path: "models/saved/macro_model.pkl",
            desc: "LightGBM — 46K bars — AUC 0.98",
            details: ["80+ technical indicators", "Bull/Bear probability output", "Sep 2025–Mar 2026 training"],
            accent: "text-primary",
          },
          {
            title: "Strategy models",
            path: "models/saved/strategy_*.pkl",
            desc: "Per-strategy LightGBM classifiers",
            details: ["Breakout, Reversal, Momentum", "Mar 10–20 tick data training", "Strategy success probability"],
            accent: "text-chart-3",
          },
          {
            title: "Vol surface",
            path: "strategy/vol_surface.py",
            desc: "IV-based strike selection",
            details: ["IV edge 30%, moneyness 25%", "OI liquidity 20%, theta 10%", "Optimal strike scoring"],
            accent: "text-chart-2",
          },
        ].map((m) => (
          <Panel key={m.title} title={<span className={m.accent}>{m.title}</span>} subtitle={m.path}>
            <p className="text-sm text-foreground">{m.desc}</p>
            <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              {m.details.map((d) => (
                <li key={d}>› {d}</li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Panel title="Kelly criterion sizer" subtitle="Capital-aware sizing with half-Kelly and max_capital_per_trade cap.">
        <div className="algo-inset p-4 text-sm">
          <span className="text-primary">f*</span> <span className="text-muted-foreground">=</span> (p × b − q) / b ×{" "}
          <span className="text-chart-2">0.5</span> × regime_mult
          <p className="mt-2 text-xs text-muted-foreground">p = win rate, q = 1−p, b = avg win / avg loss</p>
          <p className="text-xs text-muted-foreground">Clamped: min 1 lot (65), max 5 lots (325)</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          {[
            { label: "Initial capital", value: "₹50,000" },
            { label: "Lot size", value: "65 units" },
            { label: "Rolling window", value: "Last 20 trades" },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-muted-foreground">{label}</span>
              <p className="font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
    </AlgoDeskShell>
  );
}
