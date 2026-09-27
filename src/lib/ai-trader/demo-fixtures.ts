/** Fixture algo desk data — mirrors services/ai-trader/scripts/demo_desk.py (no Flask/DB). */

import type { BacktestResults, LiveState } from "@/lib/ai-trader/api";

export const DEMO_NOTE =
  "Demo desk (fixture data on Vercel). Full stack: Neon Postgres + Fly Flask — docs/AI-TRADER-FREE.md.";

function mkTrade(i: number, risk: string, basePnl: number) {
  const d = new Date();
  d.setDate(d.getDate() - (10 - i));
  const ds = d.toISOString().slice(0, 10);
  const pnl = Math.round(basePnl * (i % 3 ? -0.85 : 1.1) * 100) / 100;
  return {
    entry_time: `${ds} 10:${String(15 + i).padStart(2, "0")}:00`,
    exit_time: `${ds} 11:${String(20 + i).padStart(2, "0")}:00`,
    symbol: `NIFTY${ds.replace(/-/g, "").slice(2)}24500CE`,
    direction: (i % 2 === 0 ? "CALL" : "PUT") as "CALL" | "PUT",
    strategy: risk === "low" ? "MEAN_REVERT" : "MOMENTUM",
    entry_premium: 120 + i * 3,
    exit_premium: 120 + i * 3 + pnl / 25,
    sl: 90,
    target: 180,
    sl_pct: 25,
    tgt_pct: 50,
    lot_size: risk === "high" ? 25 : risk === "medium" ? 15 : 10,
    pnl,
    result: pnl > 0 ? "TARGET" : "SL",
    ml_prob: 0.62 + i * 0.02,
    strat_prob: 0.58,
    flow_score: 0.4,
    final_score: 0.71,
    regime: "BULL_TREND",
    index_price: 24480 + i * 12,
  };
}

function profile(risk: "low" | "medium" | "high", n: number, scale: number) {
  const trades = Array.from({ length: n }, (_, i) => mkTrade(i, risk, scale * 800));
  const pnls = trades.map((t) => t.pnl);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);
  let run = 0;
  const equity = pnls.map((p) => {
    run += p;
    return Math.round(run * 100) / 100;
  });
  let peak = equity[0] ?? 0;
  let maxDd = 0;
  for (const e of equity) {
    peak = Math.max(peak, e);
    maxDd = Math.min(maxDd, e - peak);
  }
  const total = pnls.reduce((a, b) => a + b, 0);
  return {
    trades: trades.length,
    pnl: Math.round(total * 100) / 100,
    win_rate: Math.round((wins.length / Math.max(pnls.length, 1)) * 1000) / 10,
    avg_win: wins.length ? Math.round((wins.reduce((a, b) => a + b, 0) / wins.length) * 100) / 100 : 0,
    avg_loss: losses.length ? Math.round((losses.reduce((a, b) => a + b, 0) / losses.length) * 100) / 100 : 0,
    max_dd: Math.round(maxDd * 100) / 100,
    rr:
      wins.length && losses.length
        ? Math.round(Math.abs(wins.reduce((a, b) => a + b, 0) / wins.length / (losses.reduce((a, b) => a + b, 0) / losses.length)) * 100) / 100
        : 1.2,
    equity_curve: equity,
    trade_list: trades,
  };
}

export const DEMO_RESULTS: BacktestResults = {
  low: profile("low", 8, 0.6),
  medium: profile("medium", 12, 1),
  high: profile("high", 16, 1.4),
};

export const DEMO_CURVES = Object.fromEntries(
  (["low", "medium", "high"] as const).map((risk) => {
    const prof = DEMO_RESULTS[risk]!;
    return [
      risk,
      prof.trade_list.map((t, i) => ({
        time: t.entry_time.slice(0, 10),
        equity: prof.equity_curve[i] ?? 0,
      })),
    ];
  }),
);

export const DEMO_DAYS = Array.from({ length: 5 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (5 - i));
  return { day: d.toISOString().slice(0, 10), ticks: 12000 - i * 400 };
});

export function demoLiveState(): LiveState {
  return {
    status: "scanning",
    last_scan: new Date().toISOString().replace("T", " ").slice(0, 19),
    last_price: 24532.5,
    spot_price: 24532.5,
    regime: "BULL_TREND",
    models_loaded: true,
    strategy_models_loaded: ["MOMENTUM", "MEAN_REVERT"],
    db_connected: true,
    demo_mode: true,
    demo_note: DEMO_NOTE,
    trade_suggestions: [],
    scan_count: 42,
    signals_checked: 128,
    trades_today: 0,
    scanner_enabled: true,
    auto_trade_enabled: false,
  };
}

export function demoModeEnabled(): boolean {
  const flag = process.env.AI_TRADER_DEMO_MODE?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  const url = (process.env.AI_TRADER_API_URL || "").trim();
  if (!url) return true;
  return /127\.0\.0\.1|localhost/i.test(url);
}
