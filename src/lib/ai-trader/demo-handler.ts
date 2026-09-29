import { NextResponse } from "next/server";
import {
  DEMO_CURVES,
  DEMO_DAYS,
  DEMO_NOTE,
  DEMO_RESULTS,
  demoLiveState,
} from "@/lib/ai-trader/demo-fixtures";

export function handleDemoDesk(req: Request, pathSegments: string[]): Response {
  const subpath = pathSegments.join("/");
  const method = req.method;

  if (method === "GET" && subpath === "api/stream") {
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        const payload = () => {
          const state = demoLiveState();
          return JSON.stringify({
            state,
            positions_by_mode: { test: [], live: [] },
            tick_cache: { "NIFTY-I": { price: state.last_price, ts: new Date().toISOString().slice(11, 19) } },
            tick_cache_age: 1,
            total_open_pnl: 0,
            total_closed_pnl: 0,
            total_pnl: 0,
            total_open_pnl_test: 0,
            total_closed_pnl_test: 0,
            total_pnl_test: 0,
            total_open_pnl_live: 0,
            total_closed_pnl_live: 0,
            total_pnl_live: 0,
          });
        };
        const tick = () => {
          controller.enqueue(enc.encode(`data: ${payload()}\n\n`));
        };
        tick();
        const id = setInterval(tick, 2000);
        req.signal.addEventListener("abort", () => {
          clearInterval(id);
          controller.close();
        });
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  if (method === "GET" && subpath === "api/state") {
    return NextResponse.json(demoLiveState());
  }
  if (method === "GET" && subpath === "api/days") {
    return NextResponse.json(DEMO_DAYS);
  }
  if (method === "GET" && subpath === "api/backtest/results") {
    return NextResponse.json(DEMO_RESULTS);
  }
  if (method === "GET" && subpath === "api/equity/curve") {
    return NextResponse.json(DEMO_CURVES);
  }
  if (method === "GET" && subpath === "api/risk/profiles") {
    // Mirrors the real profiles in services/ai-trader/config/risk_profiles.py (RiskProfile shape:
    // base_lot_size, lot_multiplier, sl_pct, tgt_pct, score_threshold, max_trades_day, max_premium,
    // max_capital_per_trade). The old fixture here used a different, unrelated field set
    // (max_loss_per_trade, max_daily_loss, position_size_pct), so every card on /algo/settings and
    // /algo/backtest rendered undefined/NaN — this restores the actual shape the UI reads.
    return NextResponse.json({
      low: { name: "Conservative", base_lot_size: 65, lot_multiplier: 1.0, sl_pct: 0.15, tgt_pct: 0.5, score_threshold: 0.7, max_trades_day: 3, max_premium: 200, max_capital_per_trade: 0.008 },
      medium: { name: "Balanced", base_lot_size: 65, lot_multiplier: 1.0, sl_pct: 0.15, tgt_pct: 0.55, score_threshold: 0.6, max_trades_day: 5, max_premium: 250, max_capital_per_trade: 0.01 },
      high: { name: "Aggressive", base_lot_size: 65, lot_multiplier: 1.0, sl_pct: 0.15, tgt_pct: 0.55, score_threshold: 0.6, max_trades_day: 5, max_premium: 250, max_capital_per_trade: 0.012 },
    });
  }
  if (method === "GET" && subpath === "api/backtest/progress") {
    return NextResponse.json({
      running: false,
      risk: null,
      status: "idle",
      output_lines: [],
    });
  }
  if (method === "POST" && subpath === "api/backtest/run") {
    return NextResponse.json({ status: "demo", note: DEMO_NOTE });
  }
  if (method === "GET" && subpath === "api/broker/status") {
    return NextResponse.json({ connected: false, mode: "paper", demo_mode: true });
  }
  if (method === "GET" && subpath === "api/rl/status") {
    return NextResponse.json({ demo_mode: true });
  }
  if (method === "GET" && subpath === "api/replay/state") {
    return NextResponse.json({ status: "idle", progress: 0, demo_mode: true });
  }
  if (method === "GET" && subpath.startsWith("api/paper/")) {
    return NextResponse.json({ positions: [], total_open_pnl: 0, total_closed_pnl: 0, total_pnl: 0 });
  }
  if (method === "GET" && subpath === "api/trades/history") {
    const url = new URL(req.url);
    const risk = (url.searchParams.get("risk") || "medium") as keyof typeof DEMO_RESULTS;
    const prof = DEMO_RESULTS[risk] ?? DEMO_RESULTS.medium!;
    return NextResponse.json(prof.trade_list);
  }

  if (method === "GET") {
    return NextResponse.json({ demo_mode: true, path: subpath, note: DEMO_NOTE });
  }
  return NextResponse.json({ error: "demo_readonly", note: DEMO_NOTE }, { status: 501 });
}
