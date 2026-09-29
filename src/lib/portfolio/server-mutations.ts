import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { mergeAvgCost } from "@/lib/my-portfolio/merge-holding";
import type { Holding, PortfolioSettings } from "@/lib/my-portfolio/types";
import { BENCHMARK_IDS } from "@/lib/my-portfolio/benchmark-options";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/my-portfolio/defaults";
import { addHoldingSchema, sellHoldingSchema, updateSettingsSchema } from "@/lib/validations/portfolio";
import { z } from "zod";

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

function requireDb() {
  if (!hasDatabase()) throw new Error("Database not configured — portfolio writes need an account on the hosted site.");
}

export async function addHoldingForEmail(email: string, raw: unknown) {
  requireDb();
  const body = addHoldingSchema.parse(raw);
  const addedAt = body.addedAt ?? new Date().toISOString().slice(0, 10);
  await ensureSchema();
  const db = sql();
  const symbolUp = body.symbol.toUpperCase();

  const existingRows = (await db`
    SELECT id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
    FROM portfolio_holdings
    WHERE user_email = ${email} AND market = ${body.market} AND symbol = ${symbolUp}
    LIMIT 1
  `) as unknown as Row[];

  let outRows: Row[];
  if (existingRows[0]) {
    const prev = existingRows[0];
    const prevShares = Number(prev.shares);
    const prevCost = Number(prev.avg_cost);
    const newShares = prevShares + body.shares;
    const newAvg = mergeAvgCost(prevShares, prevCost, body.shares, body.avgCost);
    const earliestAdded = toDateString(prev.added_at) <= addedAt ? toDateString(prev.added_at) : addedAt;
    outRows = (await db`
      UPDATE portfolio_holdings
      SET shares = ${newShares},
          avg_cost = ${newAvg},
          added_at = ${earliestAdded},
          name = ${body.name},
          sector = COALESCE(${body.sector ?? null}, sector),
          instrument_key = COALESCE(${body.instrumentKey ?? null}, instrument_key)
      WHERE id = ${prev.id} AND user_email = ${email}
      RETURNING id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
    `) as unknown as Row[];
  } else {
    outRows = (await db`
      INSERT INTO portfolio_holdings (user_email, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at)
      VALUES (${email}, ${body.market}, ${symbolUp}, ${body.instrumentKey ?? null}, ${body.name}, ${body.sector ?? null}, ${body.currency}, ${body.shares}, ${body.avgCost}, ${addedAt})
      RETURNING id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
    `) as unknown as Row[];
  }

  await db`
    INSERT INTO portfolio_trade_log (user_email, symbol, side, shares, price, trade_date)
    VALUES (${email}, ${symbolUp}, 'BUY', ${body.shares}, ${body.avgCost}, ${addedAt})
  `;

  return { holding: toHolding(outRows[0]!) };
}

export async function removeHoldingForEmail(email: string, idOrSymbol: string) {
  requireDb();
  await ensureSchema();
  const db = sql();
  const key = idOrSymbol.trim();
  const rows = (await db`
    SELECT id, symbol, shares, avg_cost FROM portfolio_holdings
    WHERE user_email = ${email} AND (id::text = ${key} OR symbol = ${key.toUpperCase()})
    LIMIT 1
  `) as unknown as { id: string; symbol: string; shares: string; avg_cost: string }[];
  const row = rows[0];
  if (!row) throw new Error("Holding not found");

  await db`
    INSERT INTO portfolio_trade_log (user_email, symbol, side, shares, price, trade_date)
    VALUES (${email}, ${row.symbol}, 'SELL', ${row.shares}, ${row.avg_cost}, ${new Date().toISOString().slice(0, 10)})
  `;
  await db`DELETE FROM portfolio_holdings WHERE id = ${row.id} AND user_email = ${email}`;
  return { ok: true, symbol: row.symbol };
}

export async function sellHoldingForEmail(email: string, id: string, raw: unknown) {
  requireDb();
  const body = sellHoldingSchema.parse(raw);
  const tradeDate = body.tradeDate ?? new Date().toISOString().slice(0, 10);
  await ensureSchema();
  const db = sql();

  const existing = (await db`
    SELECT id, symbol, shares FROM portfolio_holdings WHERE id = ${id} AND user_email = ${email}
  `) as unknown as { id: string; symbol: string; shares: string }[];
  const row = existing[0];
  if (!row) throw new Error("Holding not found");
  const prevShares = Number(row.shares);
  if (body.shares > prevShares) throw new Error("Cannot sell more shares than you hold");

  await db`
    INSERT INTO portfolio_trade_log (user_email, symbol, side, shares, price, trade_date)
    VALUES (${email}, ${row.symbol}, 'SELL', ${body.shares}, ${body.price}, ${tradeDate})
  `;

  if (body.shares >= prevShares) {
    await db`DELETE FROM portfolio_holdings WHERE id = ${id} AND user_email = ${email}`;
    return { ok: true, closed: true };
  }

  const updated = (await db`
    UPDATE portfolio_holdings SET shares = ${prevShares - body.shares} WHERE id = ${id} AND user_email = ${email}
    RETURNING id, market, symbol, instrument_key, name, sector, currency, shares, avg_cost, added_at
  `) as unknown as Row[];

  return { ok: true, closed: false, holding: toHolding(updated[0]!) };
}

export async function updatePortfolioSettingsForEmail(email: string, raw: unknown) {
  requireDb();
  const body = updateSettingsSchema.parse(raw);
  const name = body.name ?? DEFAULT_PORTFOLIO_SETTINGS.name;
  const benchmark = body.benchmark ?? DEFAULT_PORTFOLIO_SETTINGS.benchmark;
  if (body.benchmark && !BENCHMARK_IDS.includes(body.benchmark)) {
    throw new Error(`Invalid benchmark. Use one of: ${BENCHMARK_IDS.join(", ")}`);
  }
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO portfolio_settings (user_email, name, benchmark)
    VALUES (${email}, ${name}, ${benchmark})
    ON CONFLICT (user_email) DO UPDATE SET name = ${name}, benchmark = ${benchmark}, updated_at = now()
  `;
  const settings: PortfolioSettings = {
    name,
    benchmark,
    baseCurrency: "INR",
    cashInr: body.cashInr ?? 0,
  };
  return { ok: true, settings, note: body.cashInr != null ? "cashInr is stored in browser local settings on the website; MCP analysis uses DB holdings only." : undefined };
}

const ImportHoldings = z.array(
  z.object({
    market: z.enum(["IN", "US"]),
    symbol: z.string(),
    name: z.string(),
    currency: z.enum(["INR", "USD"]),
    shares: z.number().positive(),
    avgCost: z.number().positive(),
    sector: z.string().nullable().optional(),
    instrumentKey: z.string().nullable().optional(),
    addedAt: z.string().optional(),
  }),
);

export async function importHoldingsForEmail(
  email: string,
  holdings: unknown,
  mode: "replace" | "append" = "replace",
) {
  requireDb();
  const parsed = ImportHoldings.parse(holdings);
  if (mode === "replace") {
    await ensureSchema();
    const db = sql();
    await db`DELETE FROM portfolio_holdings WHERE user_email = ${email}`;
  }
  const results: Holding[] = [];
  for (const h of parsed) {
    const r = await addHoldingForEmail(email, {
      market: h.market,
      symbol: h.symbol,
      name: h.name,
      currency: h.currency,
      shares: h.shares,
      avgCost: h.avgCost,
      sector: h.sector ?? null,
      instrumentKey: h.instrumentKey ?? null,
      addedAt: h.addedAt,
    });
    results.push(r.holding);
  }
  return { ok: true, count: results.length, holdings: results };
}
