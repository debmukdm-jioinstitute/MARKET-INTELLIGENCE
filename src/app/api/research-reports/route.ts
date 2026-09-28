import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { isResearchDataStale, scrapeAllResearchSources } from "@/lib/research/scrape";
import { RESEARCH_SOURCES } from "@/lib/research/sources";
import { NextResponse, after } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const broker = searchParams.get("broker");
  const q = searchParams.get("q")?.trim();
  const reco = searchParams.get("reco")?.trim().toUpperCase();
  const hasPdf = searchParams.get("hasPdf") === "1" || searchParams.get("hasPdf") === "true";
  const sort = searchParams.get("sort") || "freshness";
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 300);
  const sync = searchParams.get("sync") === "1" || searchParams.get("refresh") === "1";

  if (!hasDatabase()) {
    // In-memory fallback when database is not configured
    try {
      const allResults = await Promise.allSettled(RESEARCH_SOURCES.map((s) => s.fetchReports()));
      let items = allResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

      if (q) {
        const query = q.toLowerCase();
        items = items.filter(
          (i) =>
            i.title.toLowerCase().includes(query) ||
            (i.broker && i.broker.toLowerCase().includes(query)) ||
            (i.symbol && i.symbol.toLowerCase().includes(query)) ||
            (i.summary && i.summary.toLowerCase().includes(query)),
        );
      }
      if (broker) {
        items = items.filter((i) => i.broker?.toLowerCase().includes(broker.toLowerCase()));
      }
      if (reco) {
        items = items.filter((i) => i.recommendation?.toUpperCase() === reco);
      }
      if (hasPdf) {
        items = items.filter((i) => Boolean(i.pdfUrl));
      }

      if (sort === "oldest") {
        items.sort((a, b) => new Date(a.publishedAt ?? 0).getTime() - new Date(b.publishedAt ?? 0).getTime());
      } else if (sort === "upside") {
        items.sort((a, b) => (b.upsidePct ?? 0) - (a.upsidePct ?? 0));
      } else if (sort === "target") {
        items.sort((a, b) => (b.targetPrice ?? 0) - (a.targetPrice ?? 0));
      } else {
        items.sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime());
      }

      const brokerCounts = new Map<string, number>();
      for (const i of items) {
        if (i.broker) brokerCounts.set(i.broker, (brokerCounts.get(i.broker) ?? 0) + 1);
      }
      const brokers = Array.from(brokerCounts.entries())
        .map(([b, count]) => ({ broker: b, count }))
        .sort((a, b) => b.count - a.count);

      return NextResponse.json({
        reports: items.slice(0, limit),
        totalCount: items.length,
        pdfCount: items.filter((i) => Boolean(i.pdfUrl)).length,
        brokers,
        lastScrapedAt: new Date().toISOString(),
        dbConfigured: false,
      });
    } catch {
      return NextResponse.json({ reports: [], brokers: [], lastScrapedAt: null, dbConfigured: false });
    }
  }

  await ensureSchema();
  const db = sql();

  // Sort direction
  const orderClause =
    sort === "oldest"
      ? "ORDER BY COALESCE(published_at, scraped_at) ASC"
      : sort === "upside"
        ? "ORDER BY COALESCE(upside_pct, 0) DESC, COALESCE(published_at, scraped_at) DESC"
        : sort === "target"
          ? "ORDER BY COALESCE(target_price, 0) DESC, COALESCE(published_at, scraped_at) DESC"
          : "ORDER BY COALESCE(published_at, scraped_at) DESC";

  const rows = await db`
    SELECT
      id, source, broker, title, url, pdf_url, symbol, recommendation,
      target_price, cmp, upside_pct, report_type, summary, published_at, scraped_at
    FROM research_reports
    WHERE
      (${broker}::text IS NULL OR broker ILIKE ${`%${broker ?? ""}%`})
      AND (${reco}::text IS NULL OR recommendation = ${reco ?? ""})
      AND (${hasPdf ? true : false} = false OR pdf_url IS NOT NULL)
      AND (
        ${q ? true : false} = false
        OR (
          title ILIKE ${`%${q ?? ""}%`}
          OR broker ILIKE ${`%${q ?? ""}%`}
          OR symbol ILIKE ${`%${q ?? ""}%`}
          OR summary ILIKE ${`%${q ?? ""}%`}
        )
      )
    ${sort === "oldest" ? db`ORDER BY COALESCE(published_at, scraped_at) ASC` : sort === "upside" ? db`ORDER BY COALESCE(upside_pct, 0) DESC, COALESCE(published_at, scraped_at) DESC` : sort === "target" ? db`ORDER BY COALESCE(target_price, 0) DESC, COALESCE(published_at, scraped_at) DESC` : db`ORDER BY COALESCE(published_at, scraped_at) DESC`}
    LIMIT ${limit}
  `;

  // Aggregate stats
  const [statsRow, brokerRows, lastRow] = await Promise.all([
    db`
      SELECT
        COUNT(*)::int AS total,
        COUNT(pdf_url)::int AS pdfs
      FROM research_reports
    `,
    db`
      SELECT broker, COUNT(*)::int AS count
      FROM research_reports
      WHERE broker IS NOT NULL
      GROUP BY broker
      ORDER BY count DESC
      LIMIT 30
    `,
    db`SELECT MAX(scraped_at) AS last FROM research_reports`,
  ]);

  // If DB currently has 0 rows, 0 PDFs, or sync was requested, trigger scrape immediately
  if (sync || (rows.length === 0 && (statsRow[0]?.total ?? 0) === 0) || Number(statsRow[0]?.pdfs ?? 0) === 0) {
    try {
      await scrapeAllResearchSources();
      const freshRows = await db`
        SELECT
          id, source, broker, title, url, pdf_url, symbol, recommendation,
          target_price, cmp, upside_pct, report_type, summary, published_at, scraped_at
        FROM research_reports
        WHERE
          (${broker}::text IS NULL OR broker ILIKE ${`%${broker ?? ""}%`})
          AND (${reco}::text IS NULL OR recommendation = ${reco ?? ""})
          AND (${hasPdf ? true : false} = false OR pdf_url IS NOT NULL)
          AND (
            ${q ? true : false} = false
            OR (
              title ILIKE ${`%${q ?? ""}%`}
              OR broker ILIKE ${`%${q ?? ""}%`}
              OR symbol ILIKE ${`%${q ?? ""}%`}
              OR summary ILIKE ${`%${q ?? ""}%`}
            )
          )
        ${sort === "oldest" ? db`ORDER BY COALESCE(published_at, scraped_at) ASC` : sort === "upside" ? db`ORDER BY COALESCE(upside_pct, 0) DESC, COALESCE(published_at, scraped_at) DESC` : sort === "target" ? db`ORDER BY COALESCE(target_price, 0) DESC, COALESCE(published_at, scraped_at) DESC` : db`ORDER BY COALESCE(published_at, scraped_at) DESC`}
        LIMIT ${limit}
      `;
      const [freshStats, freshBrokers, freshLast] = await Promise.all([
        db`SELECT COUNT(*)::int AS total, COUNT(pdf_url)::int AS pdfs FROM research_reports`,
        db`
          SELECT broker, COUNT(*)::int AS count
          FROM research_reports
          WHERE broker IS NOT NULL
          GROUP BY broker
          ORDER BY count DESC
          LIMIT 30
        `,
        db`SELECT MAX(scraped_at) AS last FROM research_reports`,
      ]);
      return NextResponse.json({
        reports: freshRows,
        totalCount: freshStats[0]?.total ?? freshRows.length,
        pdfCount: freshStats[0]?.pdfs ?? freshRows.filter((r) => Boolean(r.pdf_url)).length,
        brokers: freshBrokers,
        lastScrapedAt: freshLast[0]?.last ?? new Date().toISOString(),
        dbConfigured: true,
      });
    } catch {}
  }

  // Stale-while-revalidate background refresh
  isResearchDataStale()
    .then((stale) => {
      if (stale) after(() => scrapeAllResearchSources().catch(() => {}));
    })
    .catch(() => {});

  return NextResponse.json({
    reports: rows,
    totalCount: statsRow[0]?.total ?? rows.length,
    pdfCount: statsRow[0]?.pdfs ?? rows.filter((r) => Boolean(r.pdf_url)).length,
    brokers: brokerRows,
    lastScrapedAt: lastRow[0]?.last ?? null,
    dbConfigured: true,
  });
}
