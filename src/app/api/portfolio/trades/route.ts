import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { getSessionEmail, isGuestSession } from "@/lib/session";
import type { TradeLogRow } from "@/lib/my-portfolio/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Row = {
  symbol: string;
  side: "BUY" | "SELL";
  shares: string;
  price: string;
  trade_date: string;
};

export async function GET() {
  if (!hasDatabase() || (await isGuestSession())) {
    return NextResponse.json({ trades: [] });
  }
  try {
    await ensureSchema();
    const email = await getSessionEmail();
    const db = sql();
    const rows = (await db`
      SELECT symbol, side, shares, price, trade_date
      FROM portfolio_trade_log
      WHERE user_email = ${email}
      ORDER BY trade_date DESC, id DESC
      LIMIT 500
    `) as unknown as Row[];
    const trades: TradeLogRow[] = rows.map((r) => ({
      symbol: r.symbol,
      side: r.side,
      shares: Number(r.shares),
      price: Number(r.price),
      date: toDateString(r.trade_date),
    }));
    return NextResponse.json({ trades });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load trades" }, { status: 502 });
  }
}
