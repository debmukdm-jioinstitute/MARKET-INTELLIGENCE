import { rateLimited } from "@/lib/api-guard";
import { clientIp } from "@/lib/client-ip";
import { backtestSymbol, STRATEGIES, type StrategyId } from "@/lib/trade-lab/backtest";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET ?symbol=RELIANCE&strategy=breakout → 2-year daily backtest of a preset, with the exact rules and caveats. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const strategy = sp.get("strategy") as StrategyId | null;
  if (!strategy || !STRATEGIES.some((s) => s.id === strategy)) {
    return NextResponse.json({ error: "strategy must be one of " + STRATEGIES.map((s) => s.id).join(", ") }, { status: 400 });
  }
  const ip = clientIp(req);
  if (await rateLimited(`trade-bt:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  }
  const res = await backtestSymbol(sp.get("symbol") ?? "NIFTY", strategy);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
}
