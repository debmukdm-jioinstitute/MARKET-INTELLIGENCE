import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { getQuotes } from "@/lib/feeds/quotes";
import { summarizeBrokerCalls, type BrokerCallRecord } from "@/lib/research/broker-calls";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 90;
const CACHE = "public, s-maxage=3600, stale-while-revalidate=600";
const SOURCE = { label: "Moneycontrol broker recommendations", url: "https://www.moneycontrol.com/news/brokeragerecommendations-261.html" };

/**
 * GET /api/research/broker-calls?symbol=RELIANCE
 *
 * Public broker calls we collected for the symbol in the last 90 days, with
 * server-side aggregates. NOT a market consensus. Implied upside is computed
 * only when a live CMP is available; otherwise it is omitted (never invented).
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });

  const base = { symbol, windowDays: WINDOW_DAYS, source: SOURCE };
  if (!hasDatabase()) {
    return NextResponse.json({ ...base, dbConfigured: false, ...summarizeBrokerCalls([], null) }, { headers: { "Cache-Control": CACHE } });
  }

  try {
    await ensureSchema();
    const rows = (await sql()`
      SELECT broker, action, target_price, report_date, tone, source_url
      FROM broker_calls
      WHERE symbol = ${symbol} AND report_date >= (current_date - ${WINDOW_DAYS}::int)
      ORDER BY report_date DESC, created_at DESC
      LIMIT 100
    `) as { broker: string; action: string; target_price: string | null; report_date: Date | string; tone: string | null; source_url: string }[];

    const records: BrokerCallRecord[] = rows.map((r) => ({
      broker: r.broker,
      action: r.action,
      targetPrice: r.target_price === null ? null : Number(r.target_price),
      reportDate: toDateString(r.report_date),
      tone: r.tone,
      sourceUrl: r.source_url,
    }));

    let cmp: number | null = null;
    if (records.some((r) => r.targetPrice)) {
      try {
        const { quotes } = await getQuotes([`${symbol}.NS`]);
        const live = quotes.find((q) => !q.stale && q.quote.symbol.toUpperCase() === `${symbol}.NS`);
        cmp = live?.quote.price ?? null; // stale last-good prices are not used for upside
      } catch {
        cmp = null; // no CMP → no upside figure
      }
    }

    return NextResponse.json({ ...base, dbConfigured: true, asOf: new Date().toISOString(), ...summarizeBrokerCalls(records, cmp) }, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load broker calls" }, { status: 500 });
  }
}
