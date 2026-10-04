import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const revalidate = 900;

const CACHE = "public, s-maxage=3600, stale-while-revalidate=600";
const NSE_FILINGS = "https://www.nseindia.com/companies-listing/corporate-filings-announcements";

/**
 * GET /api/research/announcements?symbol=RELIANCE&category=&limit=20
 *
 * Material NSE announcements collected for the symbol, newest first. Every
 * item links to its NSE source (the attached PDF when there is one).
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const symbol = sp.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  const category = sp.get("category")?.trim().slice(0, 60) || null;
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 20) || 20, 1), 100);
  const nseUrl = `${NSE_FILINGS}?symbol=${encodeURIComponent(symbol)}&tabIndex=equity`;

  if (!hasDatabase()) {
    return NextResponse.json({ symbol, dbConfigured: false, items: [], categories: [], count: 0, nseUrl }, { headers: { "Cache-Control": CACHE } });
  }

  try {
    await ensureSchema();
    const db = sql();
    type Item = { headline: string; category: string; broadcast_date: Date | string; attachment_url: string | null };
    type Cat = { category: string; n: number };
    const [itemRows, catRows] = await Promise.all([
      db`
        SELECT headline, category, broadcast_date, attachment_url
        FROM company_announcements
        WHERE symbol = ${symbol} AND (${category}::text IS NULL OR category = ${category})
        ORDER BY broadcast_date DESC
        LIMIT ${limit}
      `,
      db`
        SELECT category, count(*)::int AS n FROM company_announcements
        WHERE symbol = ${symbol} GROUP BY category ORDER BY n DESC
      `,
    ]);
    const items = itemRows as Item[];
    const categories = catRows as Cat[];

    const out = items.map((r) => ({
      headline: r.headline,
      category: r.category,
      broadcastDate: (r.broadcast_date instanceof Date ? r.broadcast_date : new Date(r.broadcast_date)).toISOString(),
      attachmentUrl: r.attachment_url,
    }));
    return NextResponse.json(
      { symbol, dbConfigured: true, count: out.length, items: out, categories: categories.map((c) => ({ category: c.category, count: c.n })), nseUrl },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load announcements" }, { status: 500 });
  }
}
