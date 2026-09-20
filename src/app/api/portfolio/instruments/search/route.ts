import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { searchYahooSymbols } from "@/lib/feeds/sources/yahoo";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const market = params.get("market");
  const q = params.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  if (market === "US") {
    const results = await searchYahooSymbols(q).catch(() => []);
    return NextResponse.json({
      results: results.map((r) => ({
        market: "US" as const,
        symbol: r.symbol,
        name: r.name,
        instrumentKey: null,
        sector: r.sector ?? null,
        currency: "USD" as const,
      })),
    });
  }

  if (market === "IN") {
    if (!hasDatabase()) {
      const qLower = q.toLowerCase();
      const matched = INDIA_EQUITIES.filter(
        (eq) => eq.symbol.toLowerCase().includes(qLower) || eq.name.toLowerCase().includes(qLower),
      ).slice(0, 20);
      return NextResponse.json({
        results: matched.map((r) => ({
          market: "IN" as const,
          symbol: r.symbol,
          name: r.name,
          instrumentKey: r.instrumentKey,
          sector: r.sector ?? null,
          currency: "INR" as const,
        })),
      });
    }
    await ensureSchema();
    const db = sql();
    const like = `%${q}%`;
    const prefixLike = `${q}%`;
    const rows = await db`
      SELECT trading_symbol, name, instrument_key FROM nse_instruments
      WHERE trading_symbol ILIKE ${like} OR name ILIKE ${like}
      ORDER BY (trading_symbol ILIKE ${prefixLike}) DESC, length(name) ASC
      LIMIT 20
    `;
    return NextResponse.json({
      results: rows.map((r) => ({
        market: "IN" as const,
        symbol: r.trading_symbol as string,
        name: r.name as string,
        instrumentKey: r.instrument_key as string,
        sector: null,
        currency: "INR" as const,
      })),
    });
  }

  return NextResponse.json({ error: "market query param must be IN or US" }, { status: 400 });
}
