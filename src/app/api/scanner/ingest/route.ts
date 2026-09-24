import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { saveBacktest, saveScan, saveSignals } from "@/lib/scanner/store";
import type { BacktestRun, ScanRun, SignalsRun } from "@/lib/scanner/types";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.PROWESS_INGEST_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Seed/refresh scan or backtest results computed elsewhere. POST {kind: "scan" | "backtest" | "signals", data}. Same bearer secret as the Prowess ingest. */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.kind === "scan" && body.data?.scanners && body.data?.lastBar) await saveScan(body.data as ScanRun);
  else if (body?.kind === "backtest" && Array.isArray(body.data?.scanners) && body.data?.from) await saveBacktest(body.data as BacktestRun);
  else if (body?.kind === "signals" && body.data?.nifty && body.data?.stocks) await saveSignals(body.data as SignalsRun);
  else return NextResponse.json({ error: "Expected {kind: 'scan'|'backtest'|'signals', data}" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
