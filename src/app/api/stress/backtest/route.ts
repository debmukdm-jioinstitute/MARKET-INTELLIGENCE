import { NextResponse } from "next/server";
import { getBacktest } from "@/lib/stress/backtest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    return NextResponse.json(await getBacktest(), { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "backtest failed" }, { status: 502 });
  }
}
