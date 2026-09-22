import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";

export type FoInstrument = { symbol: string; name: string; instrumentKey: string; isin: string };

/** The static 18-name list, used only until the instrument-master sync has populated `is_fo` in the DB. */
const FALLBACK_UNIVERSE: FoInstrument[] = INDIA_EQUITIES.map((i) => ({
  symbol: i.symbol,
  name: i.name,
  instrumentKey: i.instrumentKey,
  isin: i.isin,
}));

/** The full NSE F&O-eligible stock universe (~210 names) — derived from Upstox's instrument master by the weekly sync, not a hardcoded list. Falls back to the small curated list only if the DB isn't configured or hasn't synced yet. */
export async function listFoUniverse(): Promise<FoInstrument[]> {
  if (!hasDatabase()) return FALLBACK_UNIVERSE;
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT isin, instrument_key, trading_symbol, name FROM nse_instruments
    WHERE is_fo = true
    ORDER BY trading_symbol ASC
  `;
  if (rows.length === 0) return FALLBACK_UNIVERSE;
  return rows.map((r) => ({
    symbol: r.trading_symbol as string,
    name: r.name as string,
    instrumentKey: r.instrument_key as string,
    isin: r.isin as string,
  }));
}

export async function findFoInstrument(symbol: string): Promise<FoInstrument | null> {
  const upper = symbol.trim().toUpperCase();
  if (!hasDatabase()) return FALLBACK_UNIVERSE.find((i) => i.symbol === upper) ?? null;
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT isin, instrument_key, trading_symbol, name FROM nse_instruments
    WHERE is_fo = true AND trading_symbol = ${upper}
    LIMIT 1
  `;
  if (rows.length === 0) return FALLBACK_UNIVERSE.find((i) => i.symbol === upper) ?? null;
  const r = rows[0]!;
  return { symbol: r.trading_symbol as string, name: r.name as string, instrumentKey: r.instrument_key as string, isin: r.isin as string };
}
