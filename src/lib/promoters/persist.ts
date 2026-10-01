import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import type { PromoterFeedItem } from "@/lib/promoters/feed-types";

export async function persistPromoterFeedItems(items: PromoterFeedItem[]): Promise<void> {
  if (!hasDatabase()) return;
  await ensureSchema();
  const db = sql();

  for (const item of items.slice(0, 150)) {
    await db`
      INSERT INTO promoter_disclosure_feed (
        id, channel, title, category, company_name, symbol, transaction_date, source_url, snippet, collector
      ) VALUES (
        ${item.id},
        ${item.channel},
        ${item.title},
        ${item.category},
        ${item.companyName},
        ${item.symbol},
        ${item.transactionDate}::date,
        ${item.sourceUrl},
        ${item.snippet},
        ${item.collector}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        source_url = EXCLUDED.source_url,
        scraped_at = now()
    `;
  }
}

export async function loadPromoterFeedItemsFromDb(limit = 120): Promise<PromoterFeedItem[]> {
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
