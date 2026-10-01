import { NextResponse } from "next/server";
import { getLiveCompanySentimentCached } from "@/lib/reddit-sentiment/live-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Real, on-demand Reddit sentiment for one symbol with resilient multi-tier caching:
 * - Checks in-memory cache & PostgreSQL
 * - Falls back to Hugging Face FinBERT-enriched community data
 * - Supports ?refresh=true for manual re-crawling
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim();
  const refresh = searchParams.get("refresh") === "true";

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  try {
    const companySentiment = await getLiveCompanySentimentCached(symbol, { forceRefresh: refresh });
    return NextResponse.json({ success: true, companySentiment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch retail sentiment data" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { symbol?: string; refresh?: boolean };
    const symbol = body.symbol?.trim();
    if (!symbol) {
      return NextResponse.json({ error: "symbol is required in body" }, { status: 400 });
    }
    const companySentiment = await getLiveCompanySentimentCached(symbol, { forceRefresh: body.refresh ?? true });
    return NextResponse.json({ success: true, companySentiment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process sentiment request" },
      { status: 502 }
    );
  }
}
