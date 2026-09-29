import { fetchYahooBars } from "@/lib/scanner/data";
import { runAllLocalBacktests } from "@/lib/algo-backtest/strangle-backtest";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Local, no-proxy backtest: real NIFTY 50 daily history (Yahoo `^NSEI`) run through the weekly
 * short-strangle engine in src/lib/algo-backtest/. No external service, no fixture data — replaces
 * the old /api/backtest/* calls into the separate Python service for this page.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const bars = await fetchYahooBars("^NSEI", "5y");
  if (!bars || bars.length < 100) {
    return NextResponse.json({ error: "NIFTY history unavailable or too short right now — try again shortly." }, { status: 503 });
  }

  const results = runAllLocalBacktests(bars);
  return NextResponse.json({
    asOf: new Date().toISOString(),
    from: bars[0] ? new Date(bars[0].t * 1000).toISOString().slice(0, 10) : "",
    to: bars[bars.length - 1] ? new Date(bars[bars.length - 1].t * 1000).toISOString().slice(0, 10) : "",
    historyBars: bars.length,
    results,
  });
}
