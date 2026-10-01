"use client";

import { GlassLoader } from "@/components/ui/glass-loader";

import { Panel } from "@/components/layout/page-header";
import { leanToBias, optionContextForFnoIndex } from "@/lib/optionstrat/fno-index-options";
import type { StrategyLeg, StrategyRecommendation } from "@/lib/optionstrat/strategy-recommender";
import { fetchJsonAuth, isAuthRequiredError } from "@/lib/scanner/auth-fetcher";
import type { FnoIndexId } from "@/lib/scanner/fno-indices";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";

type RecommendRes = {
  ok: boolean;
  error?: string;
  spot?: number;
  expiry?: string;
  underlying?: string;
  lot_size?: number;
  recommendations?: StrategyRecommendation[];
};

type HeatmapRes = {
  heatmap_grid: { price_sim: number; t_days: number; pnl: number }[];
  max_profit: number;
  max_loss: number;
};

const RISK_OPTS = [
  { id: "conservative", label: "Conservative", sub: "~85% POP target" },
  { id: "balanced", label: "Balanced", sub: "~80% POP" },
  { id: "aggressive", label: "Aggressive", sub: "Wider wings" },
] as const;

async function loadHeatmap(indexId: FnoIndexId, spot: number, legs: StrategyLeg[], days: number, volShock: number) {
  return fetchJsonAuth<HeatmapRes>("/api/optionstrat/heatmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      index: indexId,
      spot,
      legs,
      days_to_simulate: days,
      volatility_shock: volShock,
    }),
  });
}

export function OptionStratPanel({
  indexId,
  indexLabel,
  modelCall,
}: {
  indexId: FnoIndexId;
  indexLabel: string;
  modelCall: "Bullish" | "Bearish" | "Neutral";
}) {
  const ctx = optionContextForFnoIndex(indexId);
  const [bias, setBias] = useState(() => leanToBias(modelCall));
  const [risk, setRisk] = useState<(typeof RISK_OPTS)[number]["id"]>("balanced");
  const [selected, setSelected] = useState<StrategyRecommendation | null>(null);
  const [daysSim, setDaysSim] = useState(30);
  const [volShock, setVolShock] = useState(0);
  const [heatmap, setHeatmap] = useState<HeatmapRes | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  const key =
    ctx &&
    `/api/optionstrat/recommend?index=${encodeURIComponent(indexId)}&bias=${bias}&risk=${risk}`;

  const { data, error, isLoading, mutate } = useSWR(key, (url) => fetchJsonAuth<RecommendRes>(url), {
    revalidateOnFocus: false,
  });

  const chartData = useMemo(() => {
    if (!heatmap?.heatmap_grid.length) return [];
    const tTarget = daysSim;
    const days = [...new Set(heatmap.heatmap_grid.map((d) => d.t_days))];
    const tDay = days.reduce((best, d) => (Math.abs(d - tTarget) < Math.abs(best - tTarget) ? d : best), days[0] ?? 0);
    return heatmap.heatmap_grid
      .filter((d) => d.t_days === tDay)
      .sort((a, b) => a.price_sim - b.price_sim);
  }, [heatmap, daysSim]);

  if (!ctx) {
    return (
      <Panel
        title="Options strategy lab (OptionStrat AI)"
        subtitle="Theta-style spreads aligned to your index lean — NIFTY / BANK NIFTY / FINNIFTY only (live Upstox chain)."
      >
        <p className="text-sm text-muted-foreground">
          {indexLabel} has no Upstox index chain in this app yet. Switch to{" "}
          <Link href="/intelligence/ai-signals" className="text-primary hover:underline">
            NIFTY 50
          </Link>
          , BANK NIFTY, or FINNIFTY, or open the full{" "}
          <Link href="/markets/derivatives" className="text-primary hover:underline">
            derivatives
          </Link>{" "}
          chain viewer.
        </p>
      </Panel>
    );
  }

  if (isAuthRequiredError(error)) {
    return (
      <Panel title="Options strategy lab (OptionStrat AI)" subtitle="Sign in to load live option strategies.">
        <p className="text-sm text-muted-foreground">Sign in required for Upstox-backed recommendations.</p>
      </Panel>
    );
  }

  const recs = data?.ok ? (data.recommendations ?? []) : [];

  async function onSelectStrategy(strat: StrategyRecommendation) {
    setSelected(strat);
    if (!data?.spot) return;
    setHeatmapLoading(true);
    try {
      const h = await loadHeatmap(indexId, data.spot, strat.legs, daysSim, volShock);
      setHeatmap(h);
    } catch {
      setHeatmap(null);
    } finally {
      setHeatmapLoading(false);
    }
  }

  return (
    <Panel
      title="Options strategy lab"
      subtitle={`OptionStrat-AI–style theta spreads on ${ctx.label} · lot ${ctx.lotSize} · logic from EconomiaUNMSM/OptionStrat-AI`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bias</p>
            <div className="flex gap-1">
              {(["bullish", "neutral", "bearish"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBias(b);
                    setSelected(null);
                    setHeatmap(null);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm capitalize",
                    bias === b ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Ensemble lean: {modelCall.toLowerCase()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk</p>
            <div className="flex flex-wrap gap-1">
              {RISK_OPTS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRisk(r.id);
                    setSelected(null);
                    void mutate();
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-left text-sm",
                    risk === r.id ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  {r.label}
                  <span className="ml-1 text-xs text-muted-foreground">{r.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <GlassLoader variant="card" message="Loading option chain & strategies..." detail="Calculating Greeks, implied volatility surfaces & payoff distribution" statusBadge="DERIVATIVES ENGINE ACTIVE" />
        ) : data && !data.ok ? (
          <p className="text-sm text-amber-600">{data.error ?? "Could not load strategies."}</p>
        ) : null}

        {data?.ok && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {data.underlying} spot {data.spot?.toLocaleString("en-IN")} · expiry {data.expiry} · {recs.length} structure
            {recs.length === 1 ? "" : "s"}
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {recs.map((strat) => (
            <button
              key={strat.type + strat.name}
              type="button"
              onClick={() => void onSelectStrategy(strat)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                selected?.type === strat.type ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
              )}
            >
              <p className="font-semibold">{strat.name}</p>
              <p className="mt-1 text-xs text-muted-foreground capitalize">{strat.sentiment} · {strat.legs.length} legs</p>
              <p className="mt-2 text-sm tabular-nums">
                Net credit ₹{strat.metrics.net_premium.toLocaleString("en-IN")} · max loss{" "}
                {strat.metrics.max_loss === "Unlimited" ? "Unlimited" : `₹${strat.metrics.max_loss.toLocaleString("en-IN")}`} · ROC{" "}
                {strat.metrics.roc_percent.toFixed(1)}%
              </p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold">P&L simulation · {selected.name}</p>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="text-xs text-muted-foreground">
                Days forward
                <input
                  type="range"
                  min={0}
                  max={45}
                  value={daysSim}
                  onChange={(e) => setDaysSim(Number(e.target.value))}
                  className="ml-2 align-middle"
                />
                <span className="ml-1 tabular-nums">{daysSim}</span>
              </label>
              <label className="text-xs text-muted-foreground">
                IV shock
                <input
                  type="range"
                  min={-0.1}
                  max={0.1}
                  step={0.01}
                  value={volShock}
                  onChange={(e) => setVolShock(Number(e.target.value))}
                  className="ml-2 align-middle"
                />
                <span className="ml-1 tabular-nums">{(volShock * 100).toFixed(0)}%</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => void onSelectStrategy(selected)}
              >
                Refresh chart
              </button>
            </div>
            <div className="mt-4 h-[240px]">
              {heatmapLoading ? (
                <p className="text-sm text-muted-foreground">Computing heatmap…</p>
              ) : chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="price_sim" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} width={56} />
                    <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "P&L"]} />
                    <Area type="monotone" dataKey="pnl" stroke="#1a73e8" fill="#1a73e833" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Select a strategy to simulate.</p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Research only — not trade advice. Adapted from{" "}
          <a
            href="https://github.com/EconomiaUNMSM/OptionStrat-AI"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            OptionStrat-AI
          </a>
          . Requires live Upstox session during market hours for liquid strikes.
        </p>
      </div>
    </Panel>
  );
}
