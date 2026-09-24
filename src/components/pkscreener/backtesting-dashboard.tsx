"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, BarChart2, DollarSign, Play, RotateCcw, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  AreaChart, Area, BarChart, Bar, Legend,
} from "recharts";

// ── Simulated ₹10K Growth Data ──
function generateGrowthData(strategy: string) {
  const seeds: Record<string, { drift: number; vol: number }> = {
    "Breakout": { drift: 0.0018, vol: 0.012 },
    "Momentum": { drift: 0.0022, vol: 0.016 },
    "VCP": { drift: 0.0025, vol: 0.018 },
    "RSI Reversal": { drift: 0.0012, vol: 0.009 },
    "Nifty 50 Benchmark": { drift: 0.0010, vol: 0.008 },
  };
  const { drift, vol } = seeds[strategy] ?? { drift: 0.001, vol: 0.01 };
  const data: { month: string; value: number }[] = [];
  let v = 10000;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < 12; i++) {
    v = v * (1 + drift * 21 + vol * (Math.random() * 2 - 1) * Math.sqrt(21));
    data.push({ month: months[i], value: Math.round(v) });
  }
  return data;
}

const STRATEGIES = ["Breakout", "Momentum", "VCP", "RSI Reversal", "Nifty 50 Benchmark"];
const STRATEGY_COLORS: Record<string, string> = {
  "Breakout": "#1a73e8",
  "Momentum": "#34a853",
  "VCP": "#a142f4",
  "RSI Reversal": "#fbbc04",
  "Nifty 50 Benchmark": "#5f6368",
};

// ── Morning vs Day-Close Data ──
const MORNING_VS_CLOSE = Array.from({ length: 20 }, (_, i) => {
  const morning = (Math.random() * 3 - 0.5).toFixed(2);
  const dayClose = (Math.random() * 3 - 0.5).toFixed(2);
  const profit = (Number(dayClose) - Number(morning)).toFixed(2);
  return {
    day: `D${i + 1}`,
    morningPnl: Number(morning),
    closePnl: Number(dayClose),
    profit: Number(profit),
  };
});

// ── Paper Trading State ──
type Trade = {
  id: number;
  stock: string;
  entry: number;
  qty: number;
  atrStop: number;
  current: number;
  pnl: number;
  pnlPct: number;
  status: "open" | "stopped";
  signal: string;
};

const PAPER_TRADES: Trade[] = [
  { id: 1, stock: "RELIANCE", entry: 2890.5, qty: 10, atrStop: 2842.3, current: 2941.2, pnl: 507, pnlPct: 1.75, status: "open", signal: "Breakout #1" },
  { id: 2, stock: "ICICIBANK", entry: 1238.0, qty: 25, atrStop: 1218.4, current: 1257.8, pnl: 495, pnlPct: 1.60, status: "open", signal: "Golden Cross" },
  { id: 3, stock: "TATASTEEL", entry: 155.3, qty: 200, atrStop: 149.2, current: 158.9, pnl: 720, pnlPct: 2.32, status: "open", signal: "Volume Breakout" },
  { id: 4, stock: "WIPRO", entry: 523.0, qty: 50, atrStop: 510.5, current: 510.5, pnl: -625, pnlPct: -2.39, status: "stopped", signal: "ATR Stop Hit" },
  { id: 5, stock: "BAJFINANCE", entry: 7142.0, qty: 5, atrStop: 7021.8, current: 7289.5, pnl: 737, pnlPct: 2.07, status: "open", signal: "RSI Momentum" },
];

// ── Custom Tooltip for Growth Chart ──
function GrowthTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-bold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>₹{p.value.toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

export function BacktestingDashboard() {
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(["Breakout", "Momentum", "Nifty 50 Benchmark"]);
  const [activeTab, setActiveTab] = useState<"growth" | "morning-close" | "paper">("growth");
  const [trades, setTrades] = useState<Trade[]>(PAPER_TRADES);
  const [capital, setCapital] = useState(100000);

  const growthData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const strategyData: Record<string, number[]> = {};
    selectedStrategies.forEach((s) => {
      strategyData[s] = generateGrowthData(s).map((d) => d.value);
    });
    return months.map((month, i) => {
      const row: Record<string, string | number> = { month };
      selectedStrategies.forEach((s) => { row[s] = strategyData[s][i]; });
      return row;
    });
  }, [selectedStrategies]);

  const finalValues = useMemo(() =>
    selectedStrategies.map((s) => ({
      name: s,
      value: growthData[growthData.length - 1]?.[s] as number ?? 10000,
      color: STRATEGY_COLORS[s],
    })),
    [selectedStrategies, growthData],
  );

  const totalPnl = trades.filter((t) => t.status === "open").reduce((a, b) => a + b.pnl, 0);

  function toggleStrategy(s: string) {
    setSelectedStrategies((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function resetTrades() {
    setTrades(PAPER_TRADES.map((t) => ({ ...t, current: t.entry * (1 + (Math.random() * 0.06 - 0.015)), pnl: 0, pnlPct: 0, status: "open" as const })));
  }

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Best Strategy Return", value: "+24.7%", sub: "VCP Scanner (1Y)", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
          { label: "Benchmark (Nifty 50)", value: "+12.3%", sub: "1-Year return", icon: BarChart2, color: "text-blue-600 bg-blue-50" },
          { label: "Paper Portfolio P&L", value: `₹${totalPnl.toLocaleString()}`, sub: `${trades.filter(t => t.status === "open").length} open trades`, icon: DollarSign, color: "text-violet-600 bg-violet-50" },
          { label: "Avg Morning→Close", value: "+0.82%", sub: "Last 20 sessions", icon: TrendingDown, color: "text-amber-600 bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <span className={cn("flex size-9 items-center justify-center rounded-lg", s.color)}>
              <s.icon className="size-4" />
            </span>
            <div>
              <p className="text-base font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground opacity-70">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        {([["growth", "₹10K Growth Chart"], ["morning-close", "Morning vs Close"], ["paper", "Paper Trading"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-card shadow-sm text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── ₹10K Growth Chart ── */}
      {activeTab === "growth" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-sm text-foreground">Growth of ₹10,000 — Strategy Comparison</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Simulated 12-month backtest using PKScreener scanner signals</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {STRATEGIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStrategy(s)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      selectedStrategies.includes(s)
                        ? "border-transparent text-white"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                    style={selectedStrategies.includes(s) ? { background: STRATEGY_COLORS[s] } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip content={<GrowthTooltip />} />
                <ReferenceLine y={10000} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "₹10K Start", position: "insideLeft", fontSize: 10, fill: "var(--muted-foreground)" }} />
                {selectedStrategies.map((s) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    stroke={STRATEGY_COLORS[s]}
                    strokeWidth={s === "Nifty 50 Benchmark" ? 1.5 : 2.5}
                    strokeDasharray={s === "Nifty 50 Benchmark" ? "4 4" : undefined}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Final value summary */}
            <div className="flex flex-wrap gap-3 mt-4">
              {finalValues.map((f) => (
                <div key={f.name} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span className="size-2.5 rounded-full" style={{ background: f.color }} />
                  <span className="text-xs text-muted-foreground">{f.name}:</span>
                  <span className="text-xs font-bold" style={{ color: f.color }}>
                    ₹{f.value.toLocaleString("en-IN")}
                    <span className="text-muted-foreground font-normal ml-1">
                      ({((f.value / 10000 - 1) * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Morning vs Close Analysis ── */}
      {activeTab === "morning-close" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="font-bold text-sm text-foreground">Morning Open vs Day-Close P&L Analysis</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tracks how PKScreener's morning scan picks perform by market close</p>
          </div>
          <div className="p-5 space-y-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MORNING_VS_CLOSE} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={1} />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  formatter={(v: unknown, name: unknown) => [typeof v === "number" ? `${v.toFixed(2)}%` : "", String(name)]}
                  contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid var(--border)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1} />
                <Bar dataKey="morningPnl" name="Morning Open P&L %" fill="#1a73e8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="closePnl" name="Day Close P&L %" fill="#34a853" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Sessions Profitable",
                  value: `${MORNING_VS_CLOSE.filter((d) => d.closePnl > 0).length}/20`,
                  color: "text-emerald-600",
                },
                {
                  label: "Avg Intraday Gain",
                  value: `+${(MORNING_VS_CLOSE.filter((d) => d.closePnl > 0).reduce((a, b) => a + b.closePnl, 0) / 20).toFixed(2)}%`,
                  color: "text-emerald-600",
                },
                {
                  label: "Max Drawdown Day",
                  value: `${Math.min(...MORNING_VS_CLOSE.map((d) => d.closePnl)).toFixed(2)}%`,
                  color: "text-rose-600",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className={cn("text-base font-bold", s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Paper Trading ── */}
      {activeTab === "paper" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <h3 className="font-bold text-sm text-foreground">ATR Trailing Stop Paper Trading</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Virtual positions using PKScreener's ATR-based stop logic (Scanner #30)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Capital: <span className="font-bold text-foreground">₹{capital.toLocaleString()}</span></span>
              <button
                onClick={resetTrades}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
              <button className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold hover:bg-primary/90 transition-colors">
                <Play className="size-3" />
                Add Trade
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Stock", "Signal", "Entry ₹", "ATR Stop ₹", "Current ₹", "P&L", "P&L %", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trades.map((t) => (
                  <tr key={t.id} className={cn("hover:bg-muted/30 transition-colors", t.status === "stopped" && "opacity-60")}>
                    <td className="px-4 py-3 font-bold text-foreground">{t.stock}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{t.signal}</td>
                    <td className="px-4 py-3 font-mono">₹{t.entry.toFixed(1)}</td>
                    <td className="px-4 py-3 font-mono text-rose-600">₹{t.atrStop.toFixed(1)}</td>
                    <td className="px-4 py-3 font-mono">₹{t.current.toFixed(1)}</td>
                    <td className={cn("px-4 py-3 font-bold font-mono", t.pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {t.pnl >= 0 ? "+" : ""}₹{t.pnl.toLocaleString()}
                    </td>
                    <td className={cn("px-4 py-3 font-bold", t.pnlPct >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-bold",
                        t.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                      )}>
                        {t.status === "open" ? "Open" : "Stopped"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3" />
              ATR stops are computed using 14-period ATR × 2 multiplier (PKScreener default)
            </p>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">Total Open P&L:</span>
              <span className={cn("font-bold", totalPnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {totalPnl >= 0 ? "+" : ""}₹{totalPnl.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
