import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Ingest API for external scrapers (Apify, Zapier, Make, n8n, browser agents, local crawlers).
 * POST /api/research-reports/ingest
 * Headers: Authorization: Bearer <CRON_SECRET | SCANNER_INGEST_SECRET>
 * Body: { reports: ScrapedReport[] }
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const ingestSecret = process.env.SCANNER_INGEST_SECRET || process.env.PROWESS_INGEST_SECRET;
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();

  // If a secret is configured on the server, require matching bearer token
  if ((cronSecret || ingestSecret) && (!auth || (auth !== cronSecret && auth !== ingestSecret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Database not configured on this deployment" }, { status: 503 });
  }

  try {
    const body = (await req.json()) as { reports?: unknown[] };
    const reports = Array.isArray(body?.reports) ? body.reports : [];
    if (reports.length === 0) {
      return NextResponse.json({ ok: false, error: "Empty reports array provided" }, { status: 400 });
    }

    await ensureSchema();
    const db = sql();
    let inserted = 0;

    for (const r of reports) {
      const item = r as Record<string, unknown>;
      const url = String(item.url || item.link || "").trim();
      const title = String(item.title || "").trim();
      if (!url || !title) continue;

      const source = String(item.source || "external_ingest").trim();
      const broker = item.broker ? String(item.broker).trim() : null;
      const pdfUrl = item.pdfUrl || item.pdf_url ? String(item.pdfUrl || item.pdf_url).trim() : null;
      const symbol = item.symbol ? String(item.symbol).trim().toUpperCase() : null;
      const recommendation = item.recommendation || item.reco ? String(item.recommendation || item.reco).trim().toUpperCase() : null;
      const targetPrice = typeof item.targetPrice === "number" ? item.targetPrice : typeof item.target_price === "number" ? item.target_price : null;
      const cmp = typeof item.cmp === "number" ? item.cmp : null;
      const upsidePct = typeof item.upsidePct === "number" ? item.upsidePct : typeof item.upside_pct === "number" ? item.upside_pct : null;
      const reportType = item.reportType || item.report_type ? String(item.reportType || item.report_type).trim() : null;
      const summary = item.summary ? String(item.summary).trim() : null;
      const publishedAt = item.publishedAt || item.published_at ? new Date(String(item.publishedAt || item.published_at)).toISOString() : new Date().toISOString();

      await db`
        INSERT INTO research_reports (
          source, broker, title, url, pdf_url, symbol, recommendation,
          target_price, cmp, upside_pct, report_type, summary, published_at
        )
        VALUES (
          ${source}, ${broker}, ${title}, ${url}, ${pdfUrl},
          ${symbol}, ${recommendation}, ${targetPrice},
          ${cmp}, ${upsidePct}, ${reportType},
          ${summary}, ${publishedAt}
        )
        ON CONFLICT (url) DO UPDATE SET
          broker = COALESCE(EXCLUDED.broker, research_reports.broker),
          pdf_url = COALESCE(EXCLUDED.pdf_url, research_reports.pdf_url),
          symbol = COALESCE(EXCLUDED.symbol, research_reports.symbol),
          recommendation = COALESCE(EXCLUDED.recommendation, research_reports.recommendation),
          target_price = COALESCE(EXCLUDED.target_price, research_reports.target_price),
          cmp = COALESCE(EXCLUDED.cmp, research_reports.cmp),
          upside_pct = COALESCE(EXCLUDED.upside_pct, research_reports.upside_pct),
          report_type = COALESCE(EXCLUDED.report_type, research_reports.report_type),
          summary = COALESCE(EXCLUDED.summary, research_reports.summary),
          published_at = COALESCE(research_reports.published_at, EXCLUDED.published_at),
          scraped_at = now()
      `;
      inserted++;
    }

    return NextResponse.json({ ok: true, count: inserted });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ingest failed" }, { status: 500 });
  }
}
