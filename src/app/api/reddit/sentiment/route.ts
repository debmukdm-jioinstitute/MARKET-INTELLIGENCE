import { NextResponse } from "next/server";
import { getLiveCompanySentimentCached } from "@/lib/reddit-sentiment/live-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Real, on-demand Reddit sentiment for one symbol — searches the tracked India subreddits live
 * (see lib/reddit-sentiment/fetch-live.ts) instead of returning fabricated per-company fixtures.
 * ?symbol is required; there is no "all companies" mode here anymore — a real-time fetch across
 * hundreds of symbols isn't something a single request can honestly do.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  try {
    const companySentiment = await getLiveCompanySentimentCached(symbol);
    return NextResponse.json({ success: true, companySentiment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch retail sentiment data" },
      { status: 502 },
    );
  }
}
