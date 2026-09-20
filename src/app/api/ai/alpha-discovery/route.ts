import { AiKeyMissingError } from "@/lib/ai/llm";
import { runAlphaDiscovery } from "@/lib/ai/alpha-discovery";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { symbols?: string[] };
  const symbols = Array.isArray(body.symbols) ? body.symbols : [];
  if (symbols.length === 0) return NextResponse.json({ error: "symbols is required" }, { status: 400 });

  try {
    const result = await runAlphaDiscovery(symbols);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AiKeyMissingError) {
      return NextResponse.json({ error: e.message, setupRequired: true }, { status: 501 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Alpha discovery failed" },
      { status: 502 },
    );
  }
}
