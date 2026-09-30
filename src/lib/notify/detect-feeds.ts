import { getWatchlistLiveSentiment } from "../reddit-sentiment/live-cache";
import { ensureSchema, hasDatabase, sql } from "../db";
import type { NewEvent } from "./types";

export async function detectFeedUpdates(): Promise<NewEvent[]> {
  const events: NewEvent[] = [];

  // 1. Broker Research Notes — real ingested notes only (research_reports table).
  // Never synthesize notes; if nothing was ingested recently, emit nothing.
  try {
    if (hasDatabase()) {
      await ensureSchema();
      const db = sql();
      const rows = await db`
        SELECT id, broker, symbol, title, recommendation, target_price, url, scraped_at
        FROM research_reports
        WHERE scraped_at > now() - interval '24 hours'
        ORDER BY scraped_at DESC
        LIMIT 50
      `;
      for (const r of rows as Record<string, unknown>[]) {
        const broker = r.broker as string | null;
        const symbol = r.symbol as string | null;
        const title = String(r.title ?? "New research note");
        const reco = r.recommendation as string | null;
        events.push({
          key: `broker:${String(r.id)}`,
          category: "broker",
          severity: "medium",
          title: `New research note${broker ? ` from ${broker}` : ""}${symbol ? ` on ${symbol}` : ""}${reco ? ` — ${reco}` : ""}`,
          body: title,
          href: "/research",
        });
      }
    }
  } catch (e) {
    console.error("Broker feed notification detection error", e);
  }

  // 2. Retail Sentiment Surges (Reddit) — real live search across a fixed watchlist, no
  // fabricated week-over-week % (there is no honest baseline for that from a point-in-time fetch).
  // NOTE: promoter/insider, credit-rating, and mutual-fund accumulation detectors were removed —
  // those feeds have no verified live source, and fabricated records must never generate alerts.
  try {
    const reddit = await getWatchlistLiveSentiment();
    for (const c of reddit) {
      if (c.totalMentions7D >= 8) {
        events.push({
          key: `reddit:${c.symbol}:${c.totalMentions7D}:${c.netSentimentScore}`,
          category: "ai",
          severity: c.totalMentions7D >= 15 ? "high" : "medium",
          title: `Retail Reddit activity: ${c.symbol} (${c.totalMentions7D} posts this week)`,
          body: `${c.totalMentions7D} real Reddit mentions across tracked India communities. Net sentiment (keyword-based): ${c.netSentimentScore > 0 ? "+" : ""}${c.netSentimentScore}.`,
          href: "/intelligence/reddit",
        });
      }
    }
  } catch (e) {
    console.error("Reddit sentiment notification detection error", e);
  }

  return events;
}
