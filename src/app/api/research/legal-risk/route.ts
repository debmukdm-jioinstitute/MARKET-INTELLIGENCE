import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { buildRatingEvents, type RatingRowView } from "@/lib/research/ratings";
import { buildRiskChecklist, NCLT_SEARCH_URL, type FilingRow, type SebiRow } from "@/lib/research/legal-risk";
import { NextResponse } from "next/server";

export const revalidate = 900;

const CACHE = "public, s-maxage=86400, stale-while-revalidate=3600"; // 24 hours
const LEGAL_CATEGORIES = ["Default / delay", "Fraud / forensic audit", "Regulatory / legal action", "Auditor change"];
const TAXONOMY = ["litigation", "regulatory-action", "auditor-qualification", "related-party", "default/delay", "fraud-allegation", "pledge"];

const CHECKED = ["SEBI enforcement orders (final, settlement, adjudication)", "NSE filing categories (defaults, legal matters, auditor changes, fraud mentions)", "Credit-rating downgrades and negative outlooks"];
const NOT_CHECKED = ["NCLT cases (its search needs a human captcha — search it yourself below)", "Court cases, tax disputes and anything not filed with the exchange or published by SEBI"];

/**
 * GET /api/research/legal-risk?symbol=RELIANCE
 * "What could go wrong" checklist: SEBI orders + legal-category filings +
 * rating downgrades, newest/most severe first. Every row links its document;
 * nothing here is a legal conclusion.
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  const meta = { symbol, checked: CHECKED, notChecked: NOT_CHECKED, ncltUrl: NCLT_SEARCH_URL };
  if (!hasDatabase()) return NextResponse.json({ ...meta, dbConfigured: false, items: [] }, { headers: { "Cache-Control": CACHE } });

  try {
    await ensureSchema();
    const db = sql();
    const [sebi, filings, ratings] = await Promise.all([
      db`
        SELECT id, event_type, title, event_date, document_url FROM regulatory_events
        WHERE symbol = ${symbol} AND event_date >= (current_date - 730::int) ORDER BY event_date DESC LIMIT 30
      `,
      db`
        SELECT id, headline, category, broadcast_date, attachment_url, taxonomy_labels FROM company_announcements
        WHERE symbol = ${symbol} AND broadcast_date >= now() - interval '365 days'
          AND (category = ANY(${LEGAL_CATEGORIES}::text[]) OR taxonomy_labels && ${TAXONOMY}::text[])
        ORDER BY broadcast_date DESC LIMIT 40
      `,
      db`
        SELECT agency, rating, notch, outlook, watch, action, action_date, rationale_url, source FROM credit_ratings
        WHERE symbol = ${symbol} AND action_date >= (current_date - 365::int) ORDER BY action_date DESC LIMIT 100
      `,
    ]);

    const sebiRows: SebiRow[] = (sebi as { id: string; event_type: string | null; title: string; event_date: Date | string | null; document_url: string | null }[])
      .filter((r) => r.event_date)
      .map((r) => ({ id: r.id, eventType: r.event_type, title: r.title, eventDate: toDateString(r.event_date), documentUrl: r.document_url }));
    const filingRows: FilingRow[] = (filings as { id: string; headline: string; category: string; broadcast_date: Date | string; attachment_url: string | null; taxonomy_labels: string[] | null }[]).map((r) => ({
      id: r.id,
      headline: r.headline,
      category: r.category,
      broadcastDate: toDateString(r.broadcast_date),
      attachmentUrl: r.attachment_url,
      taxonomyLabels: r.taxonomy_labels,
    }));
    const ratingViews: RatingRowView[] = (ratings as { agency: string; rating: string | null; notch: string | null; outlook: string | null; watch: string | null; action: string | null; action_date: Date | string; rationale_url: string | null; source: string | null }[]).map((r) => ({
      agency: r.agency,
      rating: r.rating,
      notch: r.notch,
      outlook: r.outlook,
      watch: r.watch,
      action: r.action,
      actionDate: toDateString(r.action_date),
      rationaleUrl: r.rationale_url,
      source: r.source,
    }));

    const items = buildRiskChecklist({ sebi: sebiRows, filings: filingRows, ratingEvents: buildRatingEvents(ratingViews) });
    return NextResponse.json({ ...meta, dbConfigured: true, items }, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load the risk checklist" }, { status: 500 });
  }
}
