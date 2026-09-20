import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getSessionEmail } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { shares?: number; avgCost?: number };
  try {
    if (hasDatabase()) {
      await ensureSchema();
      const email = await getSessionEmail();
      const db = sql();
      const existing = await db`SELECT symbol, shares, avg_cost FROM portfolio_holdings WHERE id = ${id} AND user_email = ${email}`;
      const row = existing[0];
      if (row) {
        const newShares = body.shares ?? Number(row.shares);
        const newAvgCost = body.avgCost ?? Number(row.avg_cost);
        const delta = newShares - Number(row.shares);
        await db`UPDATE portfolio_holdings SET shares = ${newShares}, avg_cost = ${newAvgCost} WHERE id = ${id}`;
        if (delta !== 0) {
          await db`
            INSERT INTO portfolio_trade_log (user_email, symbol, side, shares, price, trade_date)
            VALUES (${email}, ${row.symbol as string}, ${delta > 0 ? "BUY" : "SELL"}, ${Math.abs(delta)}, ${newAvgCost}, ${new Date().toISOString().slice(0, 10)})
          `;
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true, warning: e instanceof Error ? e.message : "DB update skipped" });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    if (hasDatabase()) {
      await ensureSchema();
      const email = await getSessionEmail();
      const db = sql();
      const existing = await db`SELECT symbol, shares, avg_cost FROM portfolio_holdings WHERE id = ${id} AND user_email = ${email}`;
      const row = existing[0];
      if (row) {
        await db`
          INSERT INTO portfolio_trade_log (user_email, symbol, side, shares, price, trade_date)
          VALUES (${email}, ${row.symbol as string}, 'SELL', ${row.shares as number}, ${row.avg_cost as number}, ${new Date().toISOString().slice(0, 10)})
        `;
        await db`DELETE FROM portfolio_holdings WHERE id = ${id} AND user_email = ${email}`;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true, warning: e instanceof Error ? e.message : "DB delete skipped" });
  }
}
