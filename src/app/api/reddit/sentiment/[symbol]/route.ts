import { NextResponse } from "next/server";
import { getLiveCompanySentimentCached } from "@/lib/reddit-sentiment/live-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Props = { params: Promise<{ symbol: string }> };

/** Same real, on-demand fetch as /api/reddit/sentiment?symbol=, addressed by path segment. */
export async function GET(_req: Request, { params }: Props) {
  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol).trim();
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  try {
    const sentiment = await getLiveCompanySentimentCached(symbol);
    return NextResponse.json({ success: true, sentiment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch company sentiment" },
      { status: 502 },
    );
  }
}
