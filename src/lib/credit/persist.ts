import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import type { CreditFeedItem } from "@/lib/credit/types";

export async function persistCreditFeedItems(items: CreditFeedItem[]): Promise<void> {
  if (!hasDatabase()) return;
  await ensureSchema();
  const db = sql();

  for (const item of items.slice(0, 150)) {
    await db`
      INSERT INTO credit_rating_feed (
        id, agency, title, action, company_name, symbol, published_at, source_url, snippet, collector
      ) VALUES (
        ${item.id},
        ${item.agency},
        ${item.title},
        ${item.action},
        ${item.companyName},
        ${item.symbol},
        ${item.actionDate}::date,
        ${item.sourceUrl},
        ${item.snippet},
        ${item.collector}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        action = EXCLUDED.action,
        company_name = EXCLUDED.company_name,
        source_url = EXCLUDED.source_url,
        snippet = COALESCE(EXCLUDED.snippet, credit_rating_feed.snippet),
        scraped_at = now()
    `;
  }
}

export async function loadCreditFeedItemsFromDb(limit = 120): Promise<CreditFeedItem[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const db = sql();

  const rows = await db`
    SELECT id, agency, title, action, company_name, symbol, published_at, source_url, snippet, collector
    FROM credit_rating_feed
    ORDER BY published_at DESC NULLS LAST, scraped_at DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: String(r.id),
    agency: r.agency as CreditFeedItem["agency"],
    title: String(r.title),
    companyName: r.company_name ? String(r.company_name) : null,
    symbol: r.symbol ? String(r.symbol) : null,
    action: r.action as CreditFeedItem["action"],
    actionDate: r.published_at
      ? new Date(r.published_at as string).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    sourceUrl: String(r.source_url),
    snippet: r.snippet ? String(r.snippet) : null,
    collector: r.collector as CreditFeedItem["collector"],
  }));
}
