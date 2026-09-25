import { guardExpensive } from "@/lib/api-guard";
import { AiKeyMissingError } from "@/lib/ai/llm";
import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { runOptionsFlowPipeline } from "@/lib/options-flow/run";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_TICKERS = 20;

export async function POST(req: Request) {
  const blocked = await guardExpensive(req, { name: "ai-options", flag: "ai", max: 6, windowSec: 3600 });
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as { symbols?: string[] };
  const requested = Array.isArray(body.symbols) ? body.symbols : [];
  const universe = await listFoUniverse();
  const validSymbols = new Set(universe.map((i) => i.symbol));
  const symbols = [...new Set(requested.map((s) => s.trim().toUpperCase()))].filter((s) => validSymbols.has(s));

  if (symbols.length === 0) return NextResponse.json({ error: "Select at least one ticker from the F&O watchlist" }, { status: 400 });
  if (symbols.length > MAX_TICKERS) return NextResponse.json({ error: `Select at most ${MAX_TICKERS} tickers per run` }, { status: 400 });

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
