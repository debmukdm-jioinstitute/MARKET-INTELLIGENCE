import { cronUnauthorized } from "@/lib/api-guard";
import { fetchNseAnnouncements } from "@/lib/disclosures/nse";
import { enrichDisclosuresWithAi } from "@/lib/disclosures/ai-enricher";
import { saveDisclosures, pruneDisclosures, disclosuresMeta } from "@/lib/disclosures/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automated Cron & Crawler for Company IR Disclosures & Concalls:
 * - Scrapes live corporate announcements from NSE India
 * - Enriches with Hugging Face FinBERT sentiment analysis & key takeaways
 * - Upserts idempotently into PostgreSQL
 * - Prunes rows older than 90 days
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  return runCrawler();
}

export async function POST(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  return runCrawler();
}

async function runCrawler() {
  try {
    const raw = await fetchNseAnnouncements();
    const enriched = await enrichDisclosuresWithAi(raw);
    const saved = await saveDisclosures(enriched);
    const pruned = await pruneDisclosures();
    const meta = await disclosuresMeta();

    return NextResponse.json({
      ok: true,
      crawled: raw.length,
      saved,
      pruned,
      meta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/company-disclosures] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
