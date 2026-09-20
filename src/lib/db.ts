import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

function connectionString() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    ""
  );
}

let sqlClient: NeonQueryFunction<false, false> | null = null;

/** Lazily-created Neon client — throws only when actually queried without a DB configured. */
export function sql(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    const conn = connectionString();
    if (!conn) throw new Error("No database configured (DATABASE_URL / POSTGRES_URL unset)");
    sqlClient = neon(conn);
  }
  return sqlClient;
}

export function hasDatabase() {
  return Boolean(connectionString());
}

/**
 * Neon's driver returns Postgres `date`/`timestamptz` columns as native JS
 * `Date` objects, not strings — comparing one directly with a "YYYY-MM-DD"
 * string silently breaks (Date's default `toString()`, not `toISOString()`,
 * gets used), so every date column read from the DB must go through this.
 */
export function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

/**
 * Idempotent schema initialization — caches state in-memory so subsequent
 * calls return in 0ms, and coalesces concurrent in-flight executions.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaReady || !hasDatabase()) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    try {
      const db = sql();
      await db`
        CREATE TABLE IF NOT EXISTS portfolio_settings (
          user_email text PRIMARY KEY,
          name text NOT NULL DEFAULT 'My Portfolio',
          benchmark text NOT NULL DEFAULT 'NIFTY50',
          base_currency text NOT NULL DEFAULT 'INR',
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS portfolio_holdings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email text NOT NULL,
          market text NOT NULL CHECK (market IN ('IN', 'US')),
          symbol text NOT NULL,
          instrument_key text,
          name text NOT NULL,
          sector text,
          currency text NOT NULL,
          shares numeric NOT NULL,
          avg_cost numeric NOT NULL,
          added_at date NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_holdings_user ON portfolio_holdings(user_email)`;
      await db`
        CREATE TABLE IF NOT EXISTS portfolio_trade_log (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email text NOT NULL,
          symbol text NOT NULL,
          side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
          shares numeric NOT NULL,
          price numeric NOT NULL,
          trade_date date NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_trades_user ON portfolio_trade_log(user_email)`;
      await db`
        CREATE TABLE IF NOT EXISTS nse_instruments (
          isin text PRIMARY KEY,
          instrument_key text NOT NULL,
          trading_symbol text NOT NULL,
          name text NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_nse_symbol ON nse_instruments(trading_symbol)`;
      await db`CREATE INDEX IF NOT EXISTS idx_nse_name ON nse_instruments(name)`;
      schemaReady = true;
    } catch (e) {
      console.warn("Failed to ensure DB schema, continuing in fallback:", e);
    } finally {
      schemaPromise = null;
    }
  })();

  return schemaPromise;
}
