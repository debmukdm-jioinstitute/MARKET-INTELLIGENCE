import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { isResearchDataStale, scrapeAllResearchSources } from "@/lib/research/scrape";
import { NextResponse, after } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ reports: [], brokers: [], lastScrapedAt: null, dbConfigured: false });
  }
  await ensureSchema();
  const db = sql();

  const { searchParams } = new URL(req.url);
  const broker = searchParams.get("broker");
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 60) || 60, 200);

  const rows = q
    ? await db`
        SELECT id, source, broker, title, url, summary, published_at, scraped_at
        FROM research_reports
        WHERE (title ILIKE ${`%${q}%`} OR broker ILIKE ${`%${q}%`})
          AND (${broker}::text IS NULL OR broker ILIKE ${`%${broker ?? ""}%`})
        ORDER BY COALESCE(published_at, scraped_at) DESC
        LIMIT ${limit}
      `
    : await db`
        SELECT id, source, broker, title, url, summary, published_at, scraped_at
        FROM research_reports
        WHERE ${broker}::text IS NULL OR broker ILIKE ${`%${broker ?? ""}%`}
        ORDER BY COALESCE(published_at, scraped_at) DESC
        LIMIT ${limit}
      `;

  const brokerRows = await db`
    SELECT broker, COUNT(*)::int AS count FROM research_reports
    WHERE broker IS NOT NULL
    GROUP BY broker ORDER BY count DESC LIMIT 30
  `;
  const lastRow = await db`SELECT MAX(scraped_at) AS last FROM research_reports`;

  // Stale-while-revalidate: real page views keep the feed fresh with no cron
  // dependency and no manual trigger — the scrape runs after this response
  // is already sent, so it never slows the request down.
  isResearchDataStale()
    .then((stale) => {
      if (stale) after(() => scrapeAllResearchSources().catch(() => {}));
    })
    .catch(() => {});

  return NextResponse.json({
    reports: rows,
    brokers: brokerRows,
    lastScrapedAt: lastRow[0]?.last ?? null,
    dbConfigured: true,
  });
}
