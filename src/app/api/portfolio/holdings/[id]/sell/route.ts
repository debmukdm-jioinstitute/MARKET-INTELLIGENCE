import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { getSessionEmail, isGuestSession } from "@/lib/session";
import type { Holding } from "@/lib/my-portfolio/types";
import { sellHoldingSchema } from "@/lib/validations/portfolio";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

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

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parseResult = sellHoldingSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }
  const body = parseResult.data;
  const tradeDate = body.tradeDate ?? new Date().toISOString().slice(0, 10);

  if (!hasDatabase() || (await isGuestSession())) {
    return NextResponse.json({ ok: true, note: "Local-only sell" });
  }

  try {
    await ensureSchema();
    const email = await getSessionEmail();
    const db = sql();
    const existing = (await db`
      SELECT id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
      FROM portfolio_holdings WHERE id = ${id} AND user_email = ${email}
    `) as unknown as Row[];
    const row = existing[0];
    if (!row) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }
    const prevShares = Number(row.shares);
    if (body.shares > prevShares) {
      return NextResponse.json({ error: "Cannot sell more shares than you hold" }, { status: 400 });
    }

    await db`
      INSERT INTO portfolio_trade_log (user_email, symbol, side, shares, price, trade_date)
      VALUES (${email}, ${row.symbol}, 'SELL', ${body.shares}, ${body.price}, ${tradeDate})
    `;

    let holding: Holding | null = null;
    if (body.shares >= prevShares) {
      await db`DELETE FROM portfolio_holdings WHERE id = ${id} AND user_email = ${email}`;
    } else {
      const newShares = prevShares - body.shares;
      const updated = (await db`
        UPDATE portfolio_holdings SET shares = ${newShares} WHERE id = ${id} AND user_email = ${email}
        RETURNING id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
      `) as unknown as Row[];
      holding = toHolding(updated[0]!);
    }

    return NextResponse.json({ ok: true, holding, closed: body.shares >= prevShares });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sell failed" }, { status: 502 });
  }
}
