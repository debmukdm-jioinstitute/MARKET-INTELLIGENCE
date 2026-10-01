import { cronUnauthorized } from "@/lib/api-guard";
import { getLiveCompanySentimentCached, RETAIL_SENTIMENT_WATCHLIST } from "@/lib/reddit-sentiment/live-cache";
import { pruneOldSentimentCache, ensureRedditSchema } from "@/lib/reddit-sentiment/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automated Cron & Refresher for Reddit Alternative Social Sentiment:
 * - Refreshes retail community sentiment for bellwether Indian equities
 * - Scores headlines with Hugging Face FinBERT
 * - Upserts into PostgreSQL cache
 * - Prunes rows older than 60 days
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  return runRedditCron();
}

export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  return runRedditCron();
}

async function runRedditCron() {
  try {
    await ensureRedditSchema();
    const symbols = RETAIL_SENTIMENT_WATCHLIST.slice(0, 10);
    const refreshed: string[] = [];

    for (const symbol of symbols) {
      try {
        await getLiveCompanySentimentCached(symbol, { forceRefresh: true });
        refreshed.push(symbol);
      } catch (err) {
        console.warn(`[cron/reddit-sentiment] Failed to refresh ${symbol}:`, err);
      }
    }

    const pruned = await pruneOldSentimentCache().catch(() => 0);

    return NextResponse.json({
      ok: true,
      refreshedCount: refreshed.length,
      refreshed,
      pruned,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/reddit-sentiment] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
