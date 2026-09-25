import { hasDatabase, sql, toDateString } from "@/lib/db";
import { getNseEquityUniverse } from "@/lib/feeds/india/universe";
import { fetchUpstoxHistoricalCandles } from "@/lib/feeds/sources/upstox";

/**
 * Per-stock 52-week high/low from a year of Upstox daily candles, persisted in
 * Postgres so breadth can count new 52W highs/lows without ~2,700 candle calls
 * per request. A cron refreshes it after the close, resumably (a run only
 * touches symbols not yet refreshed today, within its time budget).
 */

export type Week52Level = { high52: number; low52: number };

const FETCH_CONCURRENCY = 20;
const LOOKBACK_DAYS = 365;
const MEM_TTL_MS = 30 * 60 * 1000;

let table: Promise<void> | null = null;
async function ensureTable() {
  table ??= (async () => {
    await sql()`CREATE TABLE IF NOT EXISTS nse_52w_levels (
      symbol text PRIMARY KEY,
      instrument_key text NOT NULL,
      high52 double precision NOT NULL,
      low52 double precision NOT NULL,
      as_of date NOT NULL
    )`;
  })().catch((e) => {
    table = null;
    throw e;
  });
  return table;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Refreshes stale rows until `budgetMs` runs out. Returns how much is done so a re-run can resume. */
export async function refreshWeek52Levels(budgetMs = 50_000) {
  if (!hasDatabase()) throw new Error("No database configured");
  await ensureTable();
  const started = Date.now();
  const today = iso(new Date());

  const universe = await getNseEquityUniverse();
  const fresh = new Set(
    ((await sql()`SELECT symbol FROM nse_52w_levels WHERE as_of >= ${today}`) as { symbol: string }[]).map(
      (r) => r.symbol,
    ),
  );
  const todo = universe.filter((u) => !fresh.has(u.symbol));

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - LOOKBACK_DAYS);

  let updated = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < todo.length && Date.now() - started < budgetMs) {
      const u = todo[cursor++];
      try {
        const candles = await fetchUpstoxHistoricalCandles(u.instrumentKey, "days", "1", iso(from), iso(to));
        if (candles.length === 0) continue; // new listing / suspended — no history yet
        const high52 = Math.max(...candles.map((c) => c.high));
        const low52 = Math.min(...candles.map((c) => c.low));
        await sql()`INSERT INTO nse_52w_levels (symbol, instrument_key, high52, low52, as_of)
          VALUES (${u.symbol}, ${u.instrumentKey}, ${high52}, ${low52}, ${today})
          ON CONFLICT (symbol) DO UPDATE SET instrument_key = EXCLUDED.instrument_key,
            high52 = EXCLUDED.high52, low52 = EXCLUDED.low52, as_of = EXCLUDED.as_of`;
        updated++;
      } catch {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker));

  return {
    universe: universe.length,
    alreadyFresh: fresh.size,
    updated,
    failed,
    remaining: Math.max(0, todo.length - cursor),
  };
}

let mem: { at: number; levels: Map<string, Week52Level> } | null = null;

/** symbol -> 52W levels. Empty map when there is no DB or no data yet. */
export async function getWeek52Levels(): Promise<Map<string, Week52Level>> {
  if (mem && Date.now() - mem.at < MEM_TTL_MS) return mem.levels;
  const levels = new Map<string, Week52Level>();
  if (hasDatabase()) {
    try {
      await ensureTable();
      const rows = (await sql()`SELECT symbol, high52, low52, as_of FROM nse_52w_levels`) as {
        symbol: string;
        high52: number;
        low52: number;
        as_of: unknown;
      }[];
      const cutoff = Date.now() - 7 * 24 * 3_600_000; // ignore levels older than a week
      for (const r of rows) {
        if (new Date(toDateString(r.as_of)).getTime() >= cutoff) {
          levels.set(r.symbol, { high52: Number(r.high52), low52: Number(r.low52) });
        }
      }
    } catch {
      /* no levels -> caller falls back to NSE */
    }
  }
  mem = { at: Date.now(), levels };
  return levels;
}
