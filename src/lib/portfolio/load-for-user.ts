import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/my-portfolio/defaults";
import { computePortfolioAnalysis } from "@/lib/my-portfolio/metrics";
import type { Holding, PortfolioSettings, TradeLogRow } from "@/lib/my-portfolio/types";

/** Signed-in user's holdings, settings, and computed analysis (same as GET /api/portfolio/analysis). */
export async function loadPortfolioAnalysisForUser(email: string) {
  if (!hasDatabase()) return { error: "Database not configured" as const };

  await ensureSchema();
  const db = sql();

  let settings: PortfolioSettings = DEFAULT_PORTFOLIO_SETTINGS;
  let holdings: Holding[] = [];
  let tradeLog: TradeLogRow[] = [];

  const [settingsRows, holdingRows, tradeRows] = await Promise.all([
    db`SELECT name, benchmark FROM portfolio_settings WHERE user_email = ${email}`,
    db`
      SELECT id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
      FROM portfolio_holdings WHERE user_email = ${email} ORDER BY created_at ASC
    `,
    db`SELECT symbol, side, shares, price, trade_date FROM portfolio_trade_log WHERE user_email = ${email} ORDER BY trade_date ASC`,
  ]);

  if (settingsRows.length > 0) {
    settings = {
      name: (settingsRows[0]?.name as string) ?? DEFAULT_PORTFOLIO_SETTINGS.name,
      benchmark: (settingsRows[0]?.benchmark as PortfolioSettings["benchmark"]) ?? DEFAULT_PORTFOLIO_SETTINGS.benchmark,
      baseCurrency: "INR",
    };
  }

  holdings = holdingRows.map((r) => ({
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

  tradeLog = tradeRows.map((r) => ({
    symbol: r.symbol as string,
    side: r.side as TradeLogRow["side"],
    shares: Number(r.shares),
    price: Number(r.price),
    date: toDateString(r.trade_date),
  }));

  const analysis = await computePortfolioAnalysis(holdings, settings, tradeLog);
  return { settings, holdings, tradeLog, analysis };
}
