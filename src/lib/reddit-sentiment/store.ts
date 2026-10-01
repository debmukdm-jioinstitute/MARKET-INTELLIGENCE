import { sql, hasDatabase } from "@/lib/db";
import type { LiveCompanySentiment } from "./fetch-live";
import { SEED_REDDIT_SENTIMENT } from "./seed-data";

let ready: Promise<void> | null = null;

// In-memory cache fallback for instant response
const memoryCache = new Map<string, { at: number; data: LiveCompanySentiment }>();
const MEMORY_TTL_MS = 30 * 60_000; // 30 minutes

export function ensureRedditSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS reddit_sentiment_cache (
        symbol text PRIMARY KEY,
        company_name text NOT NULL,
        sector text NOT NULL,
        market_cap_tier text,
        total_mentions integer NOT NULL DEFAULT 0,
        positive_pct integer NOT NULL DEFAULT 0,
        negative_pct integer NOT NULL DEFAULT 0,
        neutral_pct integer NOT NULL DEFAULT 0,
        net_sentiment_score integer NOT NULL DEFAULT 0,
        community_distribution jsonb NOT NULL DEFAULT '[]'::jsonb,
        top_posts jsonb NOT NULL DEFAULT '[]'::jsonb,
        ai_summary text,
        sentiment_source text NOT NULL DEFAULT 'finbert',
        fetched_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_reddit_sentiment_fetched ON reddit_sentiment_cache (fetched_at DESC)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export async function saveCachedSentiment(s: LiveCompanySentiment): Promise<void> {
  // Always update in-memory cache
  memoryCache.set(s.symbol.toUpperCase(), { at: Date.now(), data: s });

  if (!hasDatabase()) return;
  try {
    await ensureRedditSchema();
    const db = sql();
    await db`
      INSERT INTO reddit_sentiment_cache (
        symbol, company_name, sector, market_cap_tier, total_mentions,
        positive_pct, negative_pct, neutral_pct, net_sentiment_score,
        community_distribution, top_posts, sentiment_source, fetched_at
      ) VALUES (
        ${s.symbol.toUpperCase()}, ${s.companyName}, ${s.sector}, ${s.marketCapTier ?? null},
        ${s.totalMentions7D}, ${s.positivePct}, ${s.negativePct}, ${s.neutralPct},
        ${s.netSentimentScore}, ${JSON.stringify(s.communityDistribution)}::jsonb,
        ${JSON.stringify(s.topPosts)}::jsonb, ${s.sentimentSource}, now()
      )
      ON CONFLICT (symbol) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        sector = EXCLUDED.sector,
        market_cap_tier = EXCLUDED.market_cap_tier,
        total_mentions = EXCLUDED.total_mentions,
        positive_pct = EXCLUDED.positive_pct,
        negative_pct = EXCLUDED.negative_pct,
        neutral_pct = EXCLUDED.neutral_pct,
        net_sentiment_score = EXCLUDED.net_sentiment_score,
        community_distribution = EXCLUDED.community_distribution,
        top_posts = EXCLUDED.top_posts,
        sentiment_source = EXCLUDED.sentiment_source,
        fetched_at = now()
    `;
  } catch (err) {
    console.warn("[reddit-sentiment/store] DB save failed:", err);
  }
}

export async function getCachedSentiment(symbolRaw: string): Promise<LiveCompanySentiment | null> {
  const symbol = symbolRaw.toUpperCase().trim();

  // 1. Check in-memory cache
  const mem = memoryCache.get(symbol);
  if (mem && Date.now() - mem.at < MEMORY_TTL_MS) {
    return mem.data;
  }

  // 2. Check Database
  if (hasDatabase()) {
    try {
      await ensureRedditSchema();
      const db = sql();
      const rows = await db`
        SELECT symbol, company_name, sector, market_cap_tier, total_mentions,
               positive_pct, negative_pct, neutral_pct, net_sentiment_score,
               community_distribution, top_posts, sentiment_source, fetched_at
        FROM reddit_sentiment_cache
        WHERE symbol = ${symbol}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const r = rows[0] as Record<string, unknown>;
        const data: LiveCompanySentiment = {
          symbol: String(r.symbol),
          companyName: String(r.company_name),
          sector: String(r.sector),
          marketCapTier: (r.market_cap_tier as "LARGE_CAP" | "MID_CAP" | "SMALL_CAP") || undefined,
          noData: false,
          fetchIssue: null,
          totalMentions7D: Number(r.total_mentions) || 0,
          positivePct: Number(r.positive_pct) || 0,
          negativePct: Number(r.negative_pct) || 0,
          neutralPct: Number(r.neutral_pct) || 0,
          netSentimentScore: Number(r.net_sentiment_score) || 0,
          communityDistribution: Array.isArray(r.community_distribution) ? r.community_distribution : [],
          topPosts: Array.isArray(r.top_posts) ? r.top_posts : [],
          fetchedAt: r.fetched_at instanceof Date ? r.fetched_at.toISOString() : String(r.fetched_at),
          sentimentSource: (r.sentiment_source as "finbert" | "lexicon") || "finbert",
        };
        memoryCache.set(symbol, { at: Date.now(), data });
        return data;
      }
    } catch (err) {
      console.warn("[reddit-sentiment/store] DB read failed:", err);
    }
  }

  // 3. Fallback: Seed data
  if (SEED_REDDIT_SENTIMENT[symbol]) {
    const seed = SEED_REDDIT_SENTIMENT[symbol];
    memoryCache.set(symbol, { at: Date.now(), data: seed });
    return seed;
  }

  return null;
}

export async function pruneOldSentimentCache(): Promise<number> {
  if (!hasDatabase()) return 0;
  try {
    await ensureRedditSchema();
    const db = sql();
    const rows = await db`
      DELETE FROM reddit_sentiment_cache
      WHERE fetched_at < now() - interval '60 days'
      RETURNING symbol
    `;
    return rows.length;
  } catch {
    return 0;
  }
}
