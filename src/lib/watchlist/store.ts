import { z } from "zod";
import { hasDatabase, sql } from "@/lib/db";

export const MAX_WATCHLIST_ITEMS = 100;

export const WatchlistAddInput = z.object({
  market: z.enum(["IN", "US"]),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(25, "Symbol is too long")
    .regex(/^[A-Za-z0-9._^=-]+$/, "Invalid characters in symbol"),
  name: z.string().min(1, "Name is required").max(120, "Name is too long").trim(),
  sector: z.string().max(100).nullable().optional(),
  note: z.string().max(280).nullable().optional(),
});
export type WatchlistAddInputT = z.infer<typeof WatchlistAddInput>;

export type WatchlistItem = {
  id: string;
  market: "IN" | "US";
  symbol: string;
  name: string;
  sector: string | null;
  note: string | null;
  addedAt: string;
};

let ready: Promise<void> | null = null;

export function ensureWatchlistSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS watchlist_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email text NOT NULL,
        market text NOT NULL CHECK (market IN ('IN', 'US')),
        symbol text NOT NULL,
        name text NOT NULL,
        sector text,
        note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_email, market, symbol)
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_items(user_email, created_at DESC)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

type Row = { id: string; market: "IN" | "US"; symbol: string; name: string; sector: string | null; note: string | null; created_at: Date | string };

const toItem = (r: Row): WatchlistItem => ({
  id: r.id,
  market: r.market,
  symbol: r.symbol,
  name: r.name,
  sector: r.sector,
  note: r.note,
  addedAt: new Date(r.created_at).toISOString(),
});

export async function listWatchlist(email: string): Promise<WatchlistItem[]> {
  await ensureWatchlistSchema();
  return ((await sql()`
    SELECT id, market, symbol, name, sector, note, created_at
    FROM watchlist_items WHERE user_email = ${email} ORDER BY created_at DESC
  `) as Row[]).map(toItem);
}

/** Add-or-touch: re-adding a symbol already on the list updates name/sector/note instead of erroring. */
export async function addToWatchlist(email: string, input: WatchlistAddInputT): Promise<WatchlistItem> {
  await ensureWatchlistSchema();
  const db = sql();
  const [{ n }] = (await db`SELECT count(*)::int AS n FROM watchlist_items WHERE user_email = ${email}`) as { n: number }[];
  const symbol = input.symbol.toUpperCase();
  const [existing] = (await db`SELECT id FROM watchlist_items WHERE user_email = ${email} AND market = ${input.market} AND symbol = ${symbol}`) as { id: string }[];
  if (!existing && n >= MAX_WATCHLIST_ITEMS) throw new Error(`Watchlist limit reached (${MAX_WATCHLIST_ITEMS})`);

  const [row] = (await db`
    INSERT INTO watchlist_items (user_email, market, symbol, name, sector, note)
    VALUES (${email}, ${input.market}, ${symbol}, ${input.name}, ${input.sector ?? null}, ${input.note ?? null})
    ON CONFLICT (user_email, market, symbol)
    DO UPDATE SET name = ${input.name}, sector = ${input.sector ?? null}, note = ${input.note ?? null}
    RETURNING id, market, symbol, name, sector, note, created_at
  `) as Row[];
  return toItem(row);
}

export async function removeFromWatchlist(email: string, id: string): Promise<void> {
  await ensureWatchlistSchema();
  await sql()`DELETE FROM watchlist_items WHERE id = ${id}::uuid AND user_email = ${email}`;
}
