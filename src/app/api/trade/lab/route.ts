import { rateLimited } from "@/lib/api-guard";
import { computeLab } from "@/lib/trade-lab/engine";
import { TIMEFRAMES, type Timeframe } from "@/lib/trade-lab/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function ip(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

/** GET ?symbol=RELIANCE&tf=1d → every indicator reading, pattern, level and reason for the latest bar. Pure math on Yahoo candles — no model. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const symbol = sp.get("symbol") ?? "NIFTY";
  const tf = (sp.get("tf") ?? "1d") as Timeframe;
  if (!TIMEFRAMES.some((t) => t.id === tf)) return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  if (await rateLimited(`trade-lab:${ip(req)}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  }
  const res = await computeLab(symbol, tf);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  const intraday = TIMEFRAMES.find((t) => t.id === tf)!.intraday;
  return NextResponse.json(res, {
    headers: { "Cache-Control": intraday ? "public, s-maxage=60, stale-while-revalidate=120" : "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
