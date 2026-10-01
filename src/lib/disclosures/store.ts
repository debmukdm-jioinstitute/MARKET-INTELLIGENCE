import { hasDatabase, sql } from "@/lib/db";
import type { NseAnnouncement } from "./nse";
import { fetchNseAnnouncements } from "./nse";
import { SEED_DISCLOSURES } from "./seed";
import { enrichDisclosuresWithAi } from "./ai-enricher";

/**
 * Storage for exchange-published company disclosures (NSE corporate announcements).
 *
 * Resilience & Data Filling Strategy:
 * 1. Read from PostgreSQL if configured and populated.
 * 2. If table is empty or DB is not configured, automatically crawl real-time
 *    announcements from NSE (fetchNseAnnouncements) and enrich with Hugging Face FinBERT.
 * 3. Background-sync live rows into PostgreSQL for subsequent visits.
 * 4. Fallback to curated real SEED_DISCLOSURES so users never experience a dead empty screen.
 */

export type DisclosureRow = {
  seqId: string;
  symbol: string;
  companyName: string;
  isin: string | null;
  headline: string;
  category: string;
  announcedAt: string;
  pdfUrl: string | null;
  aiSentiment?: "positive" | "negative" | "neutral" | null;
  aiScore?: number | null;
  aiSummary?: string | null;
};

let ready: Promise<void> | null = null;

// In-memory fallback cache to ensure instant ISR and sub-millisecond page renders
let memoryCache: { items: DisclosureRow[]; timestamp: number } | null = null;
const MEMORY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

export function ensureDisclosuresSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS company_disclosures (
        seq_id text PRIMARY KEY,
        symbol text NOT NULL,
        company_name text NOT NULL,
        isin text,
        headline text NOT NULL,
        category text NOT NULL,
        announced_at timestamptz NOT NULL,
        pdf_url text,
        source text NOT NULL DEFAULT 'NSE',
        ai_sentiment text,
        ai_score numeric,
        ai_summary text,
        fetched_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`ALTER TABLE company_disclosures ADD COLUMN IF NOT EXISTS ai_sentiment text`;
    await db`ALTER TABLE company_disclosures ADD COLUMN IF NOT EXISTS ai_score numeric`;
    await db`ALTER TABLE company_disclosures ADD COLUMN IF NOT EXISTS ai_summary text`;
    await db`CREATE INDEX IF NOT EXISTS idx_disclosures_time ON company_disclosures (announced_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS idx_disclosures_symbol ON company_disclosures (symbol)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/** Idempotent upsert of exchange-filed disclosures with AI enrichments. */
export async function saveDisclosures(items: (NseAnnouncement | DisclosureRow)[]): Promise<number> {
  if (!items.length || !hasDatabase()) return 0;
  await ensureDisclosuresSchema();
  const db = sql();
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    await db`
      INSERT INTO company_disclosures (
        seq_id, symbol, company_name, isin, headline, category, announced_at, pdf_url, source,
        ai_sentiment, ai_score, ai_summary, fetched_at
      )
      SELECT 
        s::text, y::text, n::text, i::text, h::text, c::text, a::timestamptz, p::text, 'NSE',
        sent::text, sc::numeric, summ::text, now()
      FROM unnest(
        ${chunk.map((x) => x.seqId)}::text[],
        ${chunk.map((x) => x.symbol)}::text[],
        ${chunk.map((x) => x.companyName)}::text[],
        ${chunk.map((x) => x.isin)}::text[],
        ${chunk.map((x) => x.headline)}::text[],
        ${chunk.map((x) => x.category)}::text[],
        ${chunk.map((x) => x.announcedAt)}::text[],
        ${chunk.map((x) => x.pdfUrl)}::text[],
        ${chunk.map((x) => ("aiSentiment" in x ? x.aiSentiment : null))}::text[],
        ${chunk.map((x) => ("aiScore" in x ? x.aiScore : null))}::numeric[],
        ${chunk.map((x) => ("aiSummary" in x ? x.aiSummary : null))}::text[]
      ) AS t(s, y, n, i, h, c, a, p, sent, sc, summ)
      ON CONFLICT (seq_id) DO UPDATE SET
        headline = EXCLUDED.headline,
        category = EXCLUDED.category,
        pdf_url = EXCLUDED.pdf_url,
        ai_sentiment = COALESCE(EXCLUDED.ai_sentiment, company_disclosures.ai_sentiment),
        ai_score = COALESCE(EXCLUDED.ai_score, company_disclosures.ai_score),
        ai_summary = COALESCE(EXCLUDED.ai_summary, company_disclosures.ai_summary),
        fetched_at = now()
    `;
  }
  return items.length;
}

/** Drop rows older than 90 days. Returns rows deleted. */
export async function pruneDisclosures(): Promise<number> {
  if (!hasDatabase()) return 0;
  await ensureDisclosuresSchema();
  const rows = await sql()`DELETE FROM company_disclosures WHERE announced_at < now() - interval '90 days' RETURNING seq_id`;
  return rows.length;
}

function rowToDisclosure(r: Record<string, unknown>): DisclosureRow {
  return {
    seqId: String(r.seq_id),
    symbol: String(r.symbol),
    companyName: String(r.company_name),
    isin: r.isin == null ? null : String(r.isin),
    headline: String(r.headline),
    category: String(r.category),
    announcedAt:
      r.announced_at instanceof Date ? r.announced_at.toISOString() : String(r.announced_at),
    pdfUrl: r.pdf_url == null ? null : String(r.pdf_url),
    aiSentiment: r.ai_sentiment ? (String(r.ai_sentiment) as "positive" | "negative" | "neutral") : null,
    aiScore: r.ai_score != null ? Number(r.ai_score) : null,
    aiSummary: r.ai_summary != null ? String(r.ai_summary) : null,
  };
}

/**
 * Newest disclosures first.
 * Never throws — guaranteed to return live or enriched seed rows.
 */
export async function latestDisclosures(limit = 40): Promise<DisclosureRow[]> {
  // 1. Check in-memory cache
  if (memoryCache && Date.now() - memoryCache.timestamp < MEMORY_CACHE_TTL_MS && memoryCache.items.length > 0) {
    return memoryCache.items.slice(0, limit);
  }

  // 2. Try DB if available
  if (hasDatabase()) {
    try {
      await ensureDisclosuresSchema();
      const rows = await sql()`
        SELECT seq_id, symbol, company_name, isin, headline, category, announced_at, pdf_url,
               ai_sentiment, ai_score, ai_summary
        FROM company_disclosures
        ORDER BY announced_at DESC
        LIMIT ${Math.min(Math.max(limit, 1), 200)}
      `;
      if (rows.length > 0) {
        const mapped = rows.map(rowToDisclosure);
        memoryCache = { items: mapped, timestamp: Date.now() };
        return mapped;
      }
    } catch (e) {
      console.warn("[disclosures] DB query failed, falling back to live crawler:", e);
    }
  }

  // 3. Fallback: Trigger live crawl directly from NSE
  try {
    const rawNse = await fetchNseAnnouncements();
    if (rawNse.length > 0) {
      const enriched = await enrichDisclosuresWithAi(rawNse);
      memoryCache = { items: enriched, timestamp: Date.now() };

      // Background persist to Postgres if DB available
      if (hasDatabase()) {
        saveDisclosures(enriched).catch((err) =>
          console.warn("[disclosures] Background DB persist failed:", err)
        );
      }

      return enriched.slice(0, limit);
    }
  } catch (err) {
    console.warn("[disclosures] Live NSE crawler failed, using high-integrity seeds:", err);
  }

  // 4. Fallback: Guaranteed Seed Disclosures
  memoryCache = { items: SEED_DISCLOSURES, timestamp: Date.now() };
  return SEED_DISCLOSURES.slice(0, limit);
}

/** Freshness signal for the page trust line. */
export async function disclosuresMeta(): Promise<{ count: number; latestAt: string | null }> {
  try {
    if (hasDatabase()) {
      await ensureDisclosuresSchema();
      const rows = await sql()`SELECT COUNT(*)::int AS n, MAX(announced_at) AS latest FROM company_disclosures`;
      const r = rows[0] as { n: number; latest: Date | null } | undefined;
      const dbCount = r?.n ?? 0;
      if (dbCount > 0) {
        return {
          count: dbCount,
          latestAt: r?.latest instanceof Date ? r.latest.toISOString() : null,
        };
      }
    }
  } catch {
    // fallback below
  }

  if (memoryCache && memoryCache.items.length > 0) {
    return {
      count: memoryCache.items.length,
      latestAt: memoryCache.items[0].announcedAt,
    };
  }

  return {
    count: SEED_DISCLOSURES.length,
    latestAt: SEED_DISCLOSURES[0].announcedAt,
  };
}
