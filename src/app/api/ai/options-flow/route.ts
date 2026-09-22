import { AiKeyMissingError } from "@/lib/ai/llm";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { runOptionsFlowPipeline } from "@/lib/options-flow/run";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_SYMBOLS = new Set(INDIA_EQUITIES.map((i) => i.symbol));
const MAX_TICKERS = 12;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { symbols?: string[] };
  const requested = Array.isArray(body.symbols) ? body.symbols : [];
  const symbols = [...new Set(requested.map((s) => s.trim().toUpperCase()))].filter((s) => VALID_SYMBOLS.has(s));

  if (symbols.length === 0) return NextResponse.json({ error: "Select at least one ticker from the watchlist" }, { status: 400 });
  if (symbols.length > MAX_TICKERS) return NextResponse.json({ error: `Select at most ${MAX_TICKERS} tickers` }, { status: 400 });

  try {
    const result = await runOptionsFlowPipeline(symbols);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AiKeyMissingError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Options flow screen failed" }, { status: 502 });
  }
}
