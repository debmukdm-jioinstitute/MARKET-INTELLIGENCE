import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { getSessionEmail } from "@/lib/session";
import { computePortfolioAnalysis } from "@/lib/my-portfolio/metrics";
import { DEFAULT_PORTFOLIO_SETTINGS, REALISTIC_DEFAULT_HOLDINGS } from "@/lib/my-portfolio/defaults";
import type { Holding, PortfolioSettings, TradeLogRow } from "@/lib/my-portfolio/types";
import { portfolioAnalysisSchema } from "@/lib/validations/portfolio";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function GET() {
  try {
    let settings: PortfolioSettings = DEFAULT_PORTFOLIO_SETTINGS;
    let holdings: Holding[] = REALISTIC_DEFAULT_HOLDINGS;
    let tradeLog: TradeLogRow[] = [];

    if (hasDatabase()) {
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

        if (settingsRows.length > 0) {
          settings = {
            name: (settingsRows[0]?.name as string) ?? DEFAULT_PORTFOLIO_SETTINGS.name,
            benchmark: (settingsRows[0]?.benchmark as PortfolioSettings["benchmark"]) ?? DEFAULT_PORTFOLIO_SETTINGS.benchmark,
            baseCurrency: "INR",
          };
        }

        if (holdingRows.length > 0) {
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
        }

        tradeLog = tradeRows.map((r) => ({
          symbol: r.symbol as string,
          side: r.side as TradeLogRow["side"],
          shares: Number(r.shares),
          price: Number(r.price),
          date: toDateString(r.trade_date),
        }));
      } catch (dbErr) {
        console.warn("DB query failed, falling back to realistic institutional portfolio:", dbErr);
      }
    }

    const analysis = await computePortfolioAnalysis(holdings, settings, tradeLog);
    return NextResponse.json(analysis);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load portfolio" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = portfolioAnalysisSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorDetails, issues: parseResult.error.issues }, { status: 400 });
    }

    const body = parseResult.data;
    const settings: PortfolioSettings = body.settings
      ? {
          name: body.settings.name ?? DEFAULT_PORTFOLIO_SETTINGS.name,
          benchmark: body.settings.benchmark ?? DEFAULT_PORTFOLIO_SETTINGS.benchmark,
          baseCurrency: "INR",
        }
      : DEFAULT_PORTFOLIO_SETTINGS;

    const holdings = (body.holdings ?? REALISTIC_DEFAULT_HOLDINGS) as Holding[];
    const tradeLog = (body.tradeLog ?? []) as TradeLogRow[];

    const analysis = await computePortfolioAnalysis(holdings, settings, tradeLog);
    return NextResponse.json(analysis);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to analyze portfolio" },
      { status: 500 },
    );
  }
}
