import { rateLimited } from "@/lib/api-guard";
import { getLab } from "@/lib/trade-lab/engine";
import { TIMEFRAMES, type Timeframe } from "@/lib/trade-lab/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET ?symbols=A,B,C&tf=1d → one compact row per symbol (price, change, verdict, RSI) from the pre-computed cache. Max 12. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const tf = (sp.get("tf") ?? "1d") as Timeframe;
  if (!TIMEFRAMES.some((t) => t.id === tf)) return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  const symbols = [...new Set((sp.get("symbols") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, 12);
  if (!symbols.length) return NextResponse.json({ rows: [] });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (await rateLimited(`trade-watch:${ip}`, 30, 60)) return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  const rows = await Promise.all(
    symbols.map(async (symbol) => {
      const r = await getLab(symbol, tf);
      if ("error" in r) return { symbol, error: r.error };
      const rsi = r.indicators.find((i) => i.id === "rsi")?.value ?? null;
      return { symbol: r.symbol, last: r.price.last, changePct: r.price.changePct, verdict: r.verdict.bias, verdictLabel: r.verdict.label, rsi, asOf: r.asOf, stale: Boolean(r.stale) };
    }),
  );
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
