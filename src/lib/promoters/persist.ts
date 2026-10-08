import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import type { PromoterFeedItem } from "@/lib/promoters/feed-types";

const RETENTION_DAYS = 90;

/** One round-trip upsert (unnest) instead of ~150 sequential INSERTs; also prunes rows past retention. */
export async function persistPromoterFeedItems(items: PromoterFeedItem[]): Promise<void> {
  if (!hasDatabase() || !items.length) return;
  await ensureSchema();
  const db = sql();
  const rows = items.slice(0, 400);

  await db`
    INSERT INTO promoter_disclosure_feed (
      id, channel, title, category, company_name, symbol, transaction_date, source_url, snippet, collector
    )
    SELECT * FROM unnest(
      ${rows.map((r) => r.id)}::text[],
      ${rows.map((r) => r.channel)}::text[],
      ${rows.map((r) => r.title)}::text[],
      ${rows.map((r) => r.category)}::text[],
      ${rows.map((r) => r.companyName)}::text[],
      ${rows.map((r) => r.symbol)}::text[],
      ${rows.map((r) => r.transactionDate)}::date[],
      ${rows.map((r) => r.sourceUrl)}::text[],
      ${rows.map((r) => r.snippet)}::text[],
      ${rows.map((r) => r.collector)}::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      transaction_date = EXCLUDED.transaction_date,
      source_url = EXCLUDED.source_url,
      snippet = EXCLUDED.snippet,
      scraped_at = now()
  `;
  await db`DELETE FROM promoter_disclosure_feed WHERE transaction_date < now()::date - ${RETENTION_DAYS}::int`;
}

/** Newest `scraped_at` in the archive — the honest "last successful refresh" time. */
export async function loadPromoterLastRefresh(): Promise<string | null> {
  if (!hasDatabase()) return null;
  await ensureSchema();
  const rows = await sql()`SELECT max(scraped_at) AS t FROM promoter_disclosure_feed`;
  const t = rows[0]?.t as Date | string | null | undefined;
  return t ? new Date(t).toISOString() : null;
}

export async function loadPromoterFeedItemsFromDb(limit = 200): Promise<PromoterFeedItem[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const db = sql();

  const rows = await db`
    SELECT id, channel, title, category, company_name, symbol, transaction_date, source_url, snippet, collector
    FROM promoter_disclosure_feed
    ORDER BY transaction_date DESC NULLS LAST, scraped_at DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: String(r.id),
    channel: r.channel as PromoterFeedItem["channel"],
    title: String(r.title),
    companyName: r.company_name ? String(r.company_name) : null,
    symbol: r.symbol ? String(r.symbol) : null,
    category: r.category as PromoterFeedItem["category"],
    transactionDate: r.transaction_date
      ? new Date(r.transaction_date as string).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    sourceUrl: String(r.source_url),
    snippet: r.snippet ? String(r.snippet) : null,
    collector: r.collector as PromoterFeedItem["collector"],
  }));
}
