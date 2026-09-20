import { AiKeyMissingError } from "@/lib/ai/anthropic";
import { runTradingDesk } from "@/lib/ai/trading-desk";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { symbol?: string };
  const symbol = (body.symbol ?? "").trim();
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });

  try {
    const result = await runTradingDesk(symbol);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AiKeyMissingError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Trading desk run failed" },
      { status: 502 },
    );
  }
}
