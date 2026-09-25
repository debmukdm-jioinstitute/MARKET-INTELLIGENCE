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

  console.log("  → Ensuring table: users...");
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      email text PRIMARY KEY,
      name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at timestamptz NOT NULL DEFAULT now(),
      last_login_at timestamptz
    )
  `;

  console.log("  → Ensuring table: nav_tabs...");
  await sql`
    CREATE TABLE IF NOT EXISTS nav_tabs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      label text NOT NULL,
      href text NOT NULL,
      icon text NOT NULL DEFAULT 'Sparkles',
      section text NOT NULL DEFAULT 'FEEDS',
      external boolean NOT NULL DEFAULT false,
      badge text,
      sort_order int NOT NULL DEFAULT 0,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log("  → Ensuring table: app_updates...");
  await sql`
    CREATE TABLE IF NOT EXISTS app_updates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      body text NOT NULL,
      severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
      published boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log("  → Ensuring table: push_subscriptions...");
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email text NOT NULL,
      endpoint text NOT NULL UNIQUE,
      p256dh text NOT NULL,
      auth text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log("  → Ensuring table: notifications_sent...");
  await sql`
    CREATE TABLE IF NOT EXISTS notifications_sent (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      body text NOT NULL,
      url text,
      recipient_count int NOT NULL DEFAULT 0,
      failure_count int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log("  → Ensuring table: newsletters...");
  await sql`
    CREATE TABLE IF NOT EXISTS newsletters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject text NOT NULL,
      html text NOT NULL,
      status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
      sent_at timestamptz,
      recipient_count int,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log("  → Ensuring table: rag_documents...");
  await sql`
    CREATE TABLE IF NOT EXISTS rag_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'app')),
      title text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    ALTER TABLE rag_documents
    ADD COLUMN IF NOT EXISTS search tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_rag_documents_search ON rag_documents USING GIN(search)`;

  console.log("  → Ensuring table: analytics_events...");
  await sql`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id bigserial PRIMARY KEY,
      user_email text,
      path text NOT NULL,
      referrer text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)`;

  console.log("  → Ensuring table: research_reports...");
  await sql`
    CREATE TABLE IF NOT EXISTS research_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source text NOT NULL,
      broker text,
      title text NOT NULL,
      url text NOT NULL UNIQUE,
      summary text,
      published_at timestamptz,
      scraped_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_research_reports_published ON research_reports(published_at DESC NULLS LAST)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_research_reports_broker ON research_reports(broker)`;

  console.log("  → Ensuring table: research_scrape_log...");
  await sql`
    CREATE TABLE IF NOT EXISTS research_scrape_log (
      id bigserial PRIMARY KEY,
      source text NOT NULL,
      ok boolean NOT NULL,
      items_found int NOT NULL DEFAULT 0,
      error text,
      ran_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_research_scrape_log_ran ON research_scrape_log(ran_at DESC)`;

  console.log("  → Ensuring tables: rate_limits, feature_flags...");
  await sql`CREATE TABLE IF NOT EXISTS rate_limits (key text NOT NULL, hit_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, hit_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS feature_flags (flag text PRIMARY KEY, enabled boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now())`;

  console.log(`✅ All database tables and indexes verified successfully in ${Date.now() - start}ms.`);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
