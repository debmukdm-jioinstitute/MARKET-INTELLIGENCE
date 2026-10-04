import {
  getLiveCompanySentimentCached,
  RETAIL_SENTIMENT_WATCHLIST,
} from "./live-cache";
import { pruneOldSentimentCache, ensureRedditSchema } from "./store";

/**
 * Shared business logic for the Reddit sentiment refresher — previously the
 * internal `runRedditCron()` helper inside
 * `src/app/api/cron/reddit-sentiment/route.ts`.
 *
 * Imported by BOTH the Vercel cron route (kept as a manual/admin fallback)
 * and the GitHub Actions runner `scripts/crons/run-reddit-sentiment.ts`.
 *
 * Steps: ensure the reddit schema → force-refresh retail sentiment for the
 * first 10 watchlist bellwethers (per-symbol errors are caught and logged,
 * never fatal) → prune cache rows older than 60 days (prune failure never
 * fatal).
 */

export type RedditSentimentCronResult =
  | {
      ok: true;
      refreshedCount: number;
      refreshed: string[];
      pruned: number;
      timestamp: string;
    }
  | { ok: false; error: string };

export async function runRedditSentimentCron(): Promise<RedditSentimentCronResult> {
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

    return {
      ok: true,
      refreshedCount: refreshed.length,
      refreshed,
      pruned,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[cron/reddit-sentiment] Error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
