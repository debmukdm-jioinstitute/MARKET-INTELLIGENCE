import { fetchNseAnnouncements } from "./nse";
import { enrichDisclosuresWithAi } from "./ai-enricher";
import { saveDisclosures, pruneDisclosures, disclosuresMeta } from "./store";

/**
 * Shared business logic for the company-disclosures crawler — previously the
 * internal `runCrawler()` helper inside
 * `src/app/api/cron/company-disclosures/route.ts`.
 *
 * Imported by BOTH the Vercel cron route (kept as a manual/admin fallback)
 * and the GitHub Actions runner `scripts/crons/run-company-disclosures.ts`.
 *
 * Steps: scrape live NSE announcements → enrich with Hugging Face FinBERT
 * sentiment & takeaways (HF_TOKEN optional — the HF lib works without it) →
 * idempotent upsert into PostgreSQL → prune rows older than 90 days.
 */

export type DisclosureCrawlResult =
  | {
      ok: true;
      crawled: number;
      saved: number;
      pruned: number;
      meta: { count: number; latestAt: string | null };
      timestamp: string;
    }
  | { ok: false; error: string };

export async function runDisclosureCrawler(): Promise<DisclosureCrawlResult> {
  try {
    const raw = await fetchNseAnnouncements();
    const enriched = await enrichDisclosuresWithAi(raw);
    const saved = await saveDisclosures(enriched);
    const pruned = await pruneDisclosures();
    const meta = await disclosuresMeta();

    return {
      ok: true,
      crawled: raw.length,
      saved,
      pruned,
      meta,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[cron/company-disclosures] Error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
