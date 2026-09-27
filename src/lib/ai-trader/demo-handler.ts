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
    return NextResponse.json({
      low: { name: "low", max_loss_per_trade: 1500, max_daily_loss: 4000, position_size_pct: 0.5 },
      medium: { name: "medium", max_loss_per_trade: 2500, max_daily_loss: 7000, position_size_pct: 1.0 },
      high: { name: "high", max_loss_per_trade: 4000, max_daily_loss: 12000, position_size_pct: 1.5 },
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
