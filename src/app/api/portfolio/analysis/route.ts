import { ensureSchema, sql, toDateString } from "@/lib/db";
import { getSessionEmail } from "@/lib/session";
import { computePortfolioAnalysis } from "@/lib/my-portfolio/metrics";
import type { Holding, PortfolioSettings, TradeLogRow } from "@/lib/my-portfolio/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function GET() {
  try {
    await ensureSchema();
    const email = await getSessionEmail();
    const db = sql();

    const [settingsRows, holdingRows, tradeRows] = await Promise.all([
      db`SELECT name, benchmark FROM portfolio_settings WHERE user_email = ${email}`,
      db`
        SELECT id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
        FROM portfolio_holdings WHERE user_email = ${email} ORDER BY created_at ASC
      `,
      db`SELECT symbol, side, shares, price, trade_date FROM portfolio_trade_log WHERE user_email = ${email} ORDER BY trade_date ASC`,
    ]);

    const settings: PortfolioSettings = {
      name: (settingsRows[0]?.name as string) ?? "My Portfolio",
      benchmark: (settingsRows[0]?.benchmark as PortfolioSettings["benchmark"]) ?? "NIFTY50",
      baseCurrency: "INR",
    };

    const holdings: Holding[] = holdingRows.map((r) => ({
      id: r.id as string,
      market: r.market as Holding["market"],
      symbol: r.symbol as string,
      instrumentKey: r.instrument_key as string | null,
      name: r.name as string,
      sector: r.sector as string | null,
      currency: r.currency as Holding["currency"],
      shares: Number(r.shares),
      avgCost: Number(r.avg_cost),
      addedAt: toDateString(r.added_at),
    }));

    const tradeLog: TradeLogRow[] = tradeRows.map((r) => ({
      symbol: r.symbol as string,
      side: r.side as TradeLogRow["side"],
      shares: Number(r.shares),
      price: Number(r.price),
      date: toDateString(r.trade_date),
    }));

    const analysis = await computePortfolioAnalysis(holdings, settings, tradeLog);
    return NextResponse.json(analysis);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load portfolio" },
      { status: 502 },
    );
  }
}
