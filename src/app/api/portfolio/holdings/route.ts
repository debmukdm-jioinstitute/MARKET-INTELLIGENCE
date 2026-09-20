import { ensureSchema, sql, toDateString } from "@/lib/db";
import { getSessionEmail } from "@/lib/session";
import type { Holding } from "@/lib/my-portfolio/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  market: "IN" | "US";
  symbol: string;
  instrument_key: string | null;
  name: string;
  sector: string | null;
  currency: "INR" | "USD";
  shares: string;
  avg_cost: string;
  added_at: string;
};

function toHolding(r: Row): Holding {
  return {
    id: r.id,
    market: r.market,
    symbol: r.symbol,
    instrumentKey: r.instrument_key,
    name: r.name,
    sector: r.sector,
    currency: r.currency,
    shares: Number(r.shares),
    avgCost: Number(r.avg_cost),
    addedAt: toDateString(r.added_at),
  };
}

export async function GET() {
  try {
    await ensureSchema();
    const email = await getSessionEmail();
    const db = sql();
    const rows = (await db`
      SELECT id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
      FROM portfolio_holdings WHERE user_email = ${email} ORDER BY created_at ASC
    `) as unknown as Row[];
    return NextResponse.json({ holdings: rows.map(toHolding) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load holdings" }, { status: 502 });
  }
}

type AddBody = {
  market: "IN" | "US";
  symbol: string;
  instrumentKey?: string | null;
  name: string;
  sector?: string | null;
  currency: "INR" | "USD";
  shares: number;
  avgCost: number;
  addedAt?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as AddBody;

  if (!body.symbol || !body.name || !body.shares || body.shares <= 0 || !body.avgCost || body.avgCost <= 0) {
    return NextResponse.json({ error: "symbol, name, shares, and avgCost are required" }, { status: 400 });
  }
  if (body.market === "IN" && !body.instrumentKey) {
    return NextResponse.json({ error: "instrumentKey is required for India holdings" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const email = await getSessionEmail();
    const addedAt = body.addedAt ?? new Date().toISOString().slice(0, 10);
    const db = sql();
    const rows = (await db`
      INSERT INTO portfolio_holdings (user_email, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at)
      VALUES (${email}, ${body.market}, ${body.symbol.toUpperCase()}, ${body.instrumentKey ?? null}, ${body.name}, ${body.sector ?? null}, ${body.currency}, ${body.shares}, ${body.avgCost}, ${addedAt})
      RETURNING id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
    `) as unknown as Row[];
    await db`
      INSERT INTO portfolio_trade_log (user_email, symbol, side, shares, price, trade_date)
      VALUES (${email}, ${body.symbol.toUpperCase()}, 'BUY', ${body.shares}, ${body.avgCost}, ${addedAt})
    `;
    return NextResponse.json({ holding: toHolding(rows[0]!) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to add holding" }, { status: 502 });
  }
}
