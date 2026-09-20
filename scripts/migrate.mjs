#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const conn =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  "";

if (!conn) {
  console.log("ℹ️  No database connection string found in environment (DATABASE_URL / POSTGRES_URL unset).");
  console.log("   Skipping migration. The application will run in resilient local/fallback mode.");
  process.exit(0);
}

console.log("🚀 Running database migrations for Market Intelligence...");

async function migrate() {
  const sql = neon(conn);
  const start = Date.now();

  console.log("  → Ensuring table: portfolio_settings...");
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_settings (
      user_email text PRIMARY KEY,
      name text NOT NULL DEFAULT 'My Portfolio',
      benchmark text NOT NULL DEFAULT 'NIFTY50',
      base_currency text NOT NULL DEFAULT 'INR',
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log("  → Ensuring table: portfolio_holdings...");
  await sql`
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
  await sql`CREATE INDEX IF NOT EXISTS idx_holdings_user ON portfolio_holdings(user_email)`;

  console.log("  → Ensuring table: portfolio_trade_log...");
  await sql`
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
  await sql`CREATE INDEX IF NOT EXISTS idx_trades_user ON portfolio_trade_log(user_email)`;

  console.log("  → Ensuring table: nse_instruments...");
  await sql`
    CREATE TABLE IF NOT EXISTS nse_instruments (
      isin text PRIMARY KEY,
      instrument_key text NOT NULL,
      trading_symbol text NOT NULL,
      name text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_nse_symbol ON nse_instruments(trading_symbol)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_nse_name ON nse_instruments(name)`;

  console.log(`✅ All database tables and indexes verified successfully in ${Date.now() - start}ms.`);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
