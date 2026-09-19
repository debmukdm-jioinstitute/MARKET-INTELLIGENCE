import { findIndiaInstrument } from "@/lib/feeds/india/instruments";
import { fetchUpstoxFullQuotes } from "@/lib/feeds/sources/upstox";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol query param required" }, { status: 400 });
  }
  const instrument = findIndiaInstrument(symbol);
  if (!instrument) {
    return NextResponse.json({ error: `Unknown India symbol: ${symbol}` }, { status: 404 });
  }
  try {
    const [quote] = await fetchUpstoxFullQuotes([
      { instrumentKey: instrument.instrumentKey, symbol: instrument.symbol },
    ]);
    if (!quote) {
      return NextResponse.json({ error: "No quote data" }, { status: 502 });
    }
    return NextResponse.json(quote, {
      headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=10" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox quote failed" },
      { status: 502 },
    );
  }
}
