import { cronUnauthorized } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { runBacktest } from "@/lib/scanner/backtest";
import { saveBacktest } from "@/lib/scanner/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Weekly cron: backtest every scanner over ~2 years of Nifty 500 daily bars and store the result. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const symbols = new URL(req.url).searchParams.get("symbols")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  try {
    const run = await runBacktest({ symbols });
    if (!symbols && run.symbols < 300) {
      return NextResponse.json({ ok: false, error: "Too few symbols; keeping previous backtest", symbols: run.symbols }, { status: 502 });
    }
    await saveBacktest(run);
    return NextResponse.json({ ok: true, symbols: run.symbols, from: run.from, to: run.to, sessions: run.sessions });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
