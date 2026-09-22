import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { RESEARCH_SOURCES } from "@/lib/research/sources";

export type ScrapeRunResult = {
  source: string;
  ok: boolean;
  itemsFound: number;
  error?: string;
};

let scrapeInFlight: Promise<ScrapeRunResult[]> | null = null;

/**
 * Runs every research source independently — one source throwing (site redesign,
 * timeout, block) never stops the others or the caller. Upserts are keyed on the
 * report URL, so re-running is always safe and never duplicates rows.
 */
export async function scrapeAllResearchSources(): Promise<ScrapeRunResult[]> {
  if (!hasDatabase()) return RESEARCH_SOURCES.map((s) => ({ source: s.key, ok: false, itemsFound: 0, error: "No database configured" }));
  if (scrapeInFlight) return scrapeInFlight;

  scrapeInFlight = (async () => {
    await ensureSchema();
    const db = sql();
    const results: ScrapeRunResult[] = [];

    for (const source of RESEARCH_SOURCES) {
      try {
        const items = await source.fetchReports();
        for (const item of items) {
          if (!item.url || !item.title) continue;
          await db`
            INSERT INTO research_reports (source, broker, title, url, summary, published_at)
            VALUES (${source.key}, ${item.broker}, ${item.title}, ${item.url}, ${item.summary}, ${item.publishedAt})
            ON CONFLICT (url) DO UPDATE SET
              broker = COALESCE(EXCLUDED.broker, research_reports.broker),
              summary = COALESCE(EXCLUDED.summary, research_reports.summary),
              published_at = COALESCE(research_reports.published_at, EXCLUDED.published_at),
              scraped_at = now()
          `;
        }
        results.push({ source: source.key, ok: true, itemsFound: items.length });
        await db`INSERT INTO research_scrape_log (source, ok, items_found) VALUES (${source.key}, true, ${items.length})`;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown scrape error";
        results.push({ source: source.key, ok: false, itemsFound: 0, error: message });
        await db`INSERT INTO research_scrape_log (source, ok, items_found, error) VALUES (${source.key}, false, 0, ${message})`.catch(() => {});
      }
    }

    return results;
  })();

  try {
    return await scrapeInFlight;
  } finally {
    scrapeInFlight = null;
  }
}

const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

export async function isResearchDataStale(): Promise<boolean> {
  if (!hasDatabase()) return false;
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT MAX(scraped_at) AS last FROM research_reports`;
  const last = rows[0]?.last as Date | null | undefined;
  if (!last) return true;
  return Date.now() - new Date(last).getTime() > STALE_AFTER_MS;
}
