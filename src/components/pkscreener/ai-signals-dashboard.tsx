"use client";

import { useState, useEffect } from "react";
import {
  Brain, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
  Clock, Zap, BarChart2, Info, RefreshCw, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ── Nifty AI Prediction ──
type Prediction = "Bullish" | "Bearish" | "Sideways";

const PREDICTION_HISTORY = [
  { date: "Mon 16 Sep", prediction: "Bullish" as Prediction, confidence: 78, actual: "Bullish", correct: true },
  { date: "Tue 17 Sep", prediction: "Bullish" as Prediction, confidence: 71, actual: "Sideways", correct: false },
  { date: "Wed 18 Sep", prediction: "Sideways" as Prediction, confidence: 65, actual: "Sideways", correct: true },
  { date: "Thu 19 Sep", prediction: "Bullish" as Prediction, confidence: 82, actual: "Bullish", correct: true },
  { date: "Fri 20 Sep", prediction: "Bearish" as Prediction, confidence: 74, actual: "Bearish", correct: true },
  { date: "Mon 23 Sep", prediction: "Bullish" as Prediction, confidence: 69, actual: "Bullish", correct: true },
  { date: "Tue 24 Sep", prediction: "Bullish" as Prediction, confidence: 76, actual: "—", correct: null },
];

// Nifty 50 simulated intraday area data
const NIFTY_AREA = Array.from({ length: 26 }, (_, i) => {
  const base = 24800 + i * 4;
  return {
    time: `${Math.floor(9 + i / 4)}:${String((i % 4) * 15).padStart(2, "0")}`,
    value: base + Math.sin(i / 3) * 60 + (Math.random() * 30 - 15),
  };
});

// ── BTST / STBT Signals ──
type TradeType = "BTST" | "STBT";
const BTST_SIGNALS: { stock: string; type: TradeType; entry: number; target: number; sl: number; confidence: number; reason: string }[] = [
  { stock: "RELIANCE", type: "BTST", entry: 2941.0, target: 2995.0, sl: 2910.0, confidence: 81, reason: "Bullish Aroon + volume breakout. Gap-up likely." },
  { stock: "HDFCBANK", type: "BTST", entry: 1762.5, target: 1798.0, sl: 1745.0, confidence: 74, reason: "Higher Highs + SuperTrend bullish. Banking sector momentum." },
  { stock: "COALINDIA", type: "BTST", entry: 488.0, target: 499.5, sl: 481.0, confidence: 77, reason: "RSI rising from 55 + bullish inside bar. MF buying trend." },
  { stock: "INFY", type: "STBT", entry: 1923.0, target: 1892.0, sl: 1938.0, confidence: 68, reason: "Death cross forming + MACD histogram below 0. Bearish divergence." },
  { stock: "SUNPHARMA", type: "BTST", entry: 1876.0, target: 1912.0, sl: 1855.0, confidence: 72, reason: "Cup & Handle completion. Breakout with volume surge." },
];

// ── Trend Forecasting ──
const TREND_STOCKS = [
  { stock: "RELIANCE", trend: "Strong Uptrend", strength: 87, ema20: 2882, ema50: 2810, price: 2941, signal: "bullish" as const, forecast: "+3.2% in 5 days" },
  { stock: "ICICIBANK", trend: "Uptrend", strength: 74, ema20: 1735, ema50: 1698, price: 1758, signal: "bullish" as const, forecast: "+2.1% in 5 days" },
  { stock: "TCS", trend: "Sideways", strength: 52, ema20: 4191, ema50: 4188, price: 4195, signal: "neutral" as const, forecast: "±0.8% in 5 days" },
  { stock: "WIPRO", trend: "Downtrend", strength: 38, ema20: 527, ema50: 541, price: 511, signal: "bearish" as const, forecast: "-2.4% in 5 days" },
  { stock: "BAJFINANCE", trend: "Strong Uptrend", strength: 91, ema20: 7088, ema50: 6940, price: 7289, signal: "bullish" as const, forecast: "+4.1% in 5 days" },
  { stock: "TATASTEEL", trend: "Uptrend", strength: 69, ema20: 155, ema50: 148, price: 159, signal: "bullish" as const, forecast: "+1.8% in 5 days" },
];

function PredictionBadge({ pred, size = "md" }: { pred: Prediction; size?: "sm" | "md" }) {
  const color = pred === "Bullish" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : pred === "Bearish" ? "bg-rose-100 text-rose-700 border-rose-200"
      : "bg-amber-100 text-amber-700 border-amber-200";
  const Icon = pred === "Bullish" ? TrendingUp : pred === "Bearish" ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 border rounded-full font-bold", color, size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-sm")}>
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
      {pred}
    </span>
  );
}

function TrendStrengthBar({ value, signal }: { value: number; signal: "bullish" | "bearish" | "neutral" }) {
  const color = signal === "bullish" ? "bg-emerald-500" : signal === "bearish" ? "bg-rose-500" : "bg-amber-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: signal === "bullish" ? "#16a34a" : signal === "bearish" ? "#dc2626" : "#d97706" }}>
        {value}
      </span>
    </div>
  );
}

export function AISignalsDashboard() {
  const [todayPrediction] = useState<{ pred: Prediction; confidence: number; gap: "Gap-Up" | "Gap-Down" | "Flat" }>({
    pred: "Bullish",
    confidence: 76,
    gap: "Gap-Up",
  });
  const [activeTab, setActiveTab] = useState<"nifty" | "btst" | "trend">("nifty");
  const [refreshing, setRefreshing] = useState(false);
  const [niftyValue, setNiftyValue] = useState(NIFTY_AREA[NIFTY_AREA.length - 1].value);

  // Simulate live Nifty ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setNiftyValue((v) => v + (Math.random() * 6 - 3));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const accuracy = PREDICTION_HISTORY.filter((h) => h.correct === true).length /
    PREDICTION_HISTORY.filter((h) => h.correct !== null).length * 100;

  const areaColor = todayPrediction.pred === "Bullish" ? "#34a853" : todayPrediction.pred === "Bearish" ? "#ea4335" : "#fbbc04";

  return (
    <div className="space-y-6">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Prediction", value: todayPrediction.pred, sub: `${todayPrediction.confidence}% confidence`, color: todayPrediction.pred === "Bullish" ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50", icon: Brain },
          { label: "Expected Gap", value: todayPrediction.gap, sub: "Tomorrow open", color: "text-blue-600 bg-blue-50", icon: ArrowUpRight },
          { label: "Model Accuracy", value: `${accuracy.toFixed(0)}%`, sub: "Last 6 sessions", color: "text-violet-600 bg-violet-50", icon: BarChart2 },
          { label: "Active BTST Picks", value: `${BTST_SIGNALS.filter(s => s.type === "BTST").length}`, sub: "For tomorrow", color: "text-amber-600 bg-amber-50", icon: Zap },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <span className={cn("flex size-9 items-center justify-center rounded-lg", s.color)}>
              <s.icon className="size-4" />
            </span>
            <div>
              <p className="text-base font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xs opacity-60 text-muted-foreground">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        {([["nifty", "Nifty AI Prediction"], ["btst", "BTST / STBT Signals"], ["trend", "Trend Forecasting"]] as const).map(([tab, label]) => (
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

      {/* ── Nifty AI Prediction ── */}
      {activeTab === "nifty" && (
        <div className="space-y-5">
          {/* Main prediction card */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase">
                  <Brain className="size-3.5 text-primary" />
                  PKScreener ML Model — Next Session Nifty 50 Prediction
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <PredictionBadge pred={todayPrediction.pred} />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-foreground">{todayPrediction.confidence}%</span>
                    <span className="text-sm text-muted-foreground">model confidence</span>
                  </div>
                  <span className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold",
                    todayPrediction.gap === "Gap-Up" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                  )}>
                    {todayPrediction.gap === "Gap-Up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {todayPrediction.gap} Expected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground max-w-md">
                  Based on end-of-day price action, FII/DII flow, India VIX (14.82), and Nifty futures OI shift.
                  Model trained on 5Y of NSE data using PKScreener's Lorentzian + gradient boosting classifier.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Live Nifty 50</p>
                <p className="text-2xl font-black font-mono text-foreground">{niftyValue.toFixed(1)}</p>
                <p className="text-xs text-emerald-600 font-semibold">+{(Math.random() * 0.5 + 0.1).toFixed(2)}%</p>
              </div>
            </div>

            {/* Confidence gauge */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Bearish</span>
                <span>Model Confidence: {todayPrediction.confidence}%</span>
                <span>Bullish</span>
              </div>
              <div className="h-3 rounded-full bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-200 relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 size-5 rounded-full border-2 border-white shadow-md transition-all"
                  style={{ left: `${todayPrediction.confidence}%`, background: areaColor }}
                />
              </div>
            </div>
          </div>

          {/* Nifty chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">Nifty 50 — Today's Session</h3>
                <p className="text-xs text-muted-foreground">Simulated intraday chart with prediction overlay</p>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={NIFTY_AREA} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={areaColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={areaColor} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={3} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.toFixed(0)} />
                <Tooltip
                  formatter={(v: unknown) => [typeof v === "number" ? v.toFixed(2) : "", "Nifty 50"]}
                  contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid var(--border)" }}
                />
                <Area type="monotone" dataKey="value" stroke={areaColor} strokeWidth={2} fill="url(#niftyGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Prediction history */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="font-bold text-sm text-foreground">Prediction History — Last 7 Sessions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Date", "Predicted", "Confidence", "Actual", "Result"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PREDICTION_HISTORY.map((row, i) => (
                    <tr key={i} className={cn("hover:bg-muted/30", row.correct === null && "opacity-70")}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.date}</td>
                      <td className="px-4 py-2.5"><PredictionBadge pred={row.prediction} size="sm" /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${row.confidence}%` }} />
                          </div>
                          <span className="font-mono">{row.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {row.actual === "—" ? <span className="text-muted-foreground italic">Pending</span>
                          : <PredictionBadge pred={row.actual as Prediction} size="sm" />}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.correct === null
                          ? <span className="text-muted-foreground">—</span>
                          : row.correct
                            ? <span className="text-emerald-600 font-bold">✓ Correct</span>
                            : <span className="text-rose-600 font-bold">✗ Miss</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── BTST / STBT ── */}
      {activeTab === "btst" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold">BTST</span> (Buy Today Sell Tomorrow) and <span className="font-bold">STBT</span> (Sell Today Buy Tomorrow) signals are AI-generated from PKScreener's end-of-day scanner. These are swing setups — use with appropriate position sizing.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {BTST_SIGNALS.map((s, i) => (
              <div key={i} className={cn(
                "rounded-xl border p-4 space-y-3 transition-all hover:shadow-md",
                s.type === "BTST" ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50",
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-foreground">{s.stock}</span>
                    <span className={cn(
                      "text-xs font-black px-2 py-0.5 rounded-full",
                      s.type === "BTST" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white",
                    )}>
                      {s.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-16 rounded-full bg-white/60 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", s.type === "BTST" ? "bg-emerald-600" : "bg-rose-600")}
                        style={{ width: `${s.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{s.confidence}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white/70 p-2 text-center">
                    <p className="text-muted-foreground">Entry</p>
                    <p className="font-bold font-mono text-foreground">₹{s.entry}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-2 text-center">
                    <p className="text-muted-foreground">Target</p>
                    <p className={cn("font-bold font-mono", s.type === "BTST" ? "text-emerald-700" : "text-rose-700")}>₹{s.target}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-2 text-center">
                    <p className="text-muted-foreground">Stop Loss</p>
                    <p className="font-bold font-mono text-rose-600">₹{s.sl}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-white/50 rounded-lg px-3 py-2 leading-relaxed">
                  {s.reason}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={cn("font-bold", s.type === "BTST" ? "text-emerald-700" : "text-rose-700")}>
                    R:R = {((Math.abs(s.target - s.entry)) / (Math.abs(s.entry - s.sl))).toFixed(1)}:1
                  </span>
                  <span className={cn("font-bold", s.type === "BTST" ? "text-emerald-700" : "text-rose-700")}>
                    {s.type === "BTST" ? "+" : ""}{(((s.target - s.entry) / s.entry) * 100).toFixed(2)}% potential
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trend Forecasting ── */}
      {activeTab === "trend" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">5-Day Trend Forecast — Top Nifty Stocks</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Powered by PKScreener's Lorentzian Classifier + EMA trend detection</p>
            </div>
            <button
              onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="divide-y divide-border">
            {TREND_STOCKS.map((s) => (
              <div key={s.stock} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-24">
                    <p className="font-bold text-sm text-foreground">{s.stock}</p>
                    <p className="font-mono text-xs text-muted-foreground">₹{s.price.toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {s.signal === "bullish" ? (
                      <TrendingUp className="size-4 text-emerald-600" />
                    ) : s.signal === "bearish" ? (
                      <TrendingDown className="size-4 text-rose-600" />
                    ) : (
                      <Minus className="size-4 text-amber-500" />
                    )}
                    <span className={cn(
                      "text-xs font-bold",
                      s.signal === "bullish" ? "text-emerald-600" : s.signal === "bearish" ? "text-rose-600" : "text-amber-600",
                    )}>
                      {s.trend}
                    </span>
                  </div>

                  <div className="flex-1 min-w-[120px]">
                    <p className="text-xs text-muted-foreground mb-1">Trend Strength</p>
                    <TrendStrengthBar value={s.strength} signal={s.signal} />
                  </div>

                  <div className="flex gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">20 EMA</p>
                      <p className="font-mono font-medium text-foreground">₹{s.ema20.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">50 EMA</p>
                      <p className="font-mono font-medium text-foreground">₹{s.ema50.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">5-Day Forecast</p>
                    <p className={cn(
                      "text-sm font-black",
                      s.forecast.startsWith("+") ? "text-emerald-600" : s.forecast.startsWith("-") ? "text-rose-600" : "text-amber-600",
                    )}>
                      {s.forecast}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border px-5 py-3 bg-muted/30">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3" />
              Forecasts are model-generated estimates. Not financial advice. Based on PKScreener's Lorentzian Classifier trained on 5Y NSE data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
