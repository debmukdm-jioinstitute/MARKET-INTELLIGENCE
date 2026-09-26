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
      // is_fo: this equity has at least one listed NSE_FO options contract — the full options-flow
      // screener universe (~210 names), derived from the same instrument-master sync, not a static list.
      await db`ALTER TABLE nse_instruments ADD COLUMN IF NOT EXISTS is_fo boolean NOT NULL DEFAULT false`;
      await db`CREATE INDEX IF NOT EXISTS idx_nse_is_fo ON nse_instruments(is_fo) WHERE is_fo`;

      // -- Admin backend --------------------------------------------------
      await db`
        CREATE TABLE IF NOT EXISTS users (
          email text PRIMARY KEY,
          name text NOT NULL,
          password_hash text NOT NULL,
          role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
          created_at timestamptz NOT NULL DEFAULT now(),
          last_login_at timestamptz
        )
      `;
      await db`
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
      await db`
        CREATE TABLE IF NOT EXISTS site_content_overrides (
          slot_key text PRIMARY KEY,
          value text NOT NULL,
          updated_by text,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS portal_page_controls (
          href text PRIMARY KEY,
          label text NOT NULL,
          nav_section text NOT NULL,
          nav_group text NOT NULL DEFAULT '',
          sort_order int NOT NULL DEFAULT 0,
          applies_to_children boolean NOT NULL DEFAULT false,
          enabled boolean NOT NULL DEFAULT true,
          locked boolean NOT NULL DEFAULT false,
          lock_message text,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS app_updates (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          body text NOT NULL,
          severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
          published boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email text NOT NULL,
          endpoint text NOT NULL UNIQUE,
          p256dh text NOT NULL,
          auth text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
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
      await db`
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
      // Registered users are subscribed by default — this is an opt-out flag, not opt-in.
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter_opt_out boolean NOT NULL DEFAULT false`;
      await db`
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL UNIQUE,
          status text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
          source text NOT NULL DEFAULT 'public_form',
          created_at timestamptz NOT NULL DEFAULT now(),
          unsubscribed_at timestamptz
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status)`;
      await db`
        CREATE TABLE IF NOT EXISTS rag_documents (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'app')),
          title text NOT NULL,
          content text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
        ALTER TABLE rag_documents
        ADD COLUMN IF NOT EXISTS search tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_rag_documents_search ON rag_documents USING GIN(search)`;
      await db`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id bigserial PRIMARY KEY,
          user_email text,
          path text NOT NULL,
          referrer text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'pageview'`;
      await db`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id text`;
      await db`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS duration_sec numeric`;
      await db`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_agent text`;
      await db`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS meta jsonb`;
      await db`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)`;
      await db`CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type, created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id, created_at DESC)`;

      // -- Research reports (auto-scraped from broker/research-firm feeds) --
      await db`
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
      await db`CREATE INDEX IF NOT EXISTS idx_research_reports_published ON research_reports(published_at DESC NULLS LAST)`;
      await db`CREATE INDEX IF NOT EXISTS idx_research_reports_broker ON research_reports(broker)`;
      await db`
        CREATE TABLE IF NOT EXISTS research_scrape_log (
          id bigserial PRIMARY KEY,
          source text NOT NULL,
          ok boolean NOT NULL,
          items_found int NOT NULL DEFAULT 0,
          error text,
          ran_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_research_scrape_log_ran ON research_scrape_log(ran_at DESC)`;

      // -- Options flow screener (data/analysis/flagging 3-agent pipeline) --
      await db`
        CREATE TABLE IF NOT EXISTS options_flow_snapshots (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          snapshot_date date NOT NULL,
          symbol text NOT NULL,
          instrument_key text NOT NULL,
          record jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(snapshot_date, symbol)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_options_flow_symbol_date ON options_flow_snapshots(symbol, snapshot_date DESC)`;
      await db`
        CREATE TABLE IF NOT EXISTS options_flow_flag_log (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          flagged_date date NOT NULL,
          symbol text NOT NULL,
          headline text NOT NULL,
          confidence text NOT NULL,
          price_at_flag numeric,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(flagged_date, symbol)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_options_flow_flag_log_symbol ON options_flow_flag_log(symbol, flagged_date DESC)`;

      await db`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key text NOT NULL,
          hit_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, hit_at DESC)`;
      await db`
        CREATE TABLE IF NOT EXISTS feature_flags (
          flag text PRIMARY KEY,
          enabled boolean NOT NULL DEFAULT true,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      schemaReady = true;
    } catch (e) {
      console.warn("Failed to ensure DB schema, continuing in fallback:", e);
    } finally {
      schemaPromise = null;
    }
  })();

  return schemaPromise;
}
