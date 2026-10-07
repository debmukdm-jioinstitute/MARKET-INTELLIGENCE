import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { ensureCompetitionSchema } from "@/lib/competition/schema";

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
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS kit_tagged_at timestamptz`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_plan text`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz`;
      await db`
        CREATE TABLE IF NOT EXISTS signup_otps (
          email text PRIMARY KEY,
          name text NOT NULL,
          password_hash text NOT NULL,
          code_hash text NOT NULL,
          attempts int NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL
        )
      `;
      await db`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
        ON users (google_sub) WHERE google_sub IS NOT NULL
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
        CREATE TABLE IF NOT EXISTS newsletter_assets (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          content_type text NOT NULL,
          data bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
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
          pdf_url text,
          symbol text,
          recommendation text,
          target_price numeric,
          cmp numeric,
          upside_pct numeric,
          report_type text,
          summary text,
          published_at timestamptz,
          scraped_at timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS pdf_url text`;
      await db`ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS symbol text`;
      await db`ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS recommendation text`;
      await db`ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS target_price numeric`;
      await db`ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS cmp numeric`;
      await db`ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS upside_pct numeric`;
      await db`ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS report_type text`;
      await db`ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS extra jsonb`;
      await db`CREATE INDEX IF NOT EXISTS idx_research_reports_published ON research_reports(published_at DESC NULLS LAST)`;
      await db`CREATE INDEX IF NOT EXISTS idx_research_reports_broker ON research_reports(broker)`;
      await db`CREATE INDEX IF NOT EXISTS idx_research_reports_symbol ON research_reports(symbol)`;
      await db`CREATE INDEX IF NOT EXISTS idx_research_reports_pdf ON research_reports(pdf_url) WHERE pdf_url IS NOT NULL`;
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

      await db`
        CREATE TABLE IF NOT EXISTS credit_rating_feed (
          id text PRIMARY KEY,
          agency text NOT NULL,
          title text NOT NULL,
          action text NOT NULL,
          company_name text,
          symbol text,
          published_at date,
          source_url text NOT NULL,
          snippet text,
          collector text NOT NULL,
          scraped_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_credit_rating_feed_pub ON credit_rating_feed(published_at DESC NULLS LAST)`;
      await db`CREATE INDEX IF NOT EXISTS idx_credit_rating_feed_agency ON credit_rating_feed(agency)`;

      await db`
        CREATE TABLE IF NOT EXISTS promoter_disclosure_feed (
          id text PRIMARY KEY,
          channel text NOT NULL,
          title text NOT NULL,
          category text NOT NULL,
          company_name text,
          symbol text,
          transaction_date date,
          source_url text NOT NULL,
          snippet text,
          collector text NOT NULL,
          scraped_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_promoter_disclosure_pub ON promoter_disclosure_feed(transaction_date DESC NULLS LAST)`;

      await db`
        CREATE TABLE IF NOT EXISTS razorpay_orders (
          id text PRIMARY KEY,
          user_email text NOT NULL,
          plan_id text NOT NULL,
          amount_paise int NOT NULL,
          status text NOT NULL DEFAULT 'created',
          payment_id text,
          created_at timestamptz NOT NULL DEFAULT now(),
          paid_at timestamptz
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_razorpay_orders_email ON razorpay_orders(user_email, created_at DESC)`;

      await db`
        CREATE TABLE IF NOT EXISTS free_ai_monthly_usage (
          user_email text NOT NULL,
          period_ym text NOT NULL,
          used_count int NOT NULL DEFAULT 0,
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_email, period_ym)
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS scanner_monthly_opens (
          user_email text NOT NULL,
          period_ym text NOT NULL,
          scanner_id text NOT NULL,
          opened_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_email, period_ym, scanner_id)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_scanner_monthly_opens_period ON scanner_monthly_opens(period_ym, user_email)`;

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

      // Set when the founder welcome email is delivered; drives the one-off backfill for older members.
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_sent_at timestamptz`;
      await db`
        CREATE TABLE IF NOT EXISTS bug_reports (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text,
          name text,
          title text NOT NULL,
          details text NOT NULL,
          severity text NOT NULL DEFAULT 'medium',
          page_url text,
          user_agent text,
          emailed boolean NOT NULL DEFAULT false,
          status text NOT NULL DEFAULT 'open',
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at DESC)`;

      // Persisted last-good quotes: when every live source fails, the quote
      // service serves the most recent real quote with stale=true rather than
      // inventing a price. Written by the quote service (throttled), read on
      // live-source failure. Free-tier friendly: one row per symbol.
      await db`
        CREATE TABLE IF NOT EXISTS retargeting_sends (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          template_id text NOT NULL,
          recipient_email text NOT NULL,
          subject text NOT NULL,
          sent_at timestamptz NOT NULL DEFAULT now(),
          sent_by text NOT NULL,
          resend_id text
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_retargeting_sends_email ON retargeting_sends(recipient_email, sent_at DESC)`;

      await db`
        CREATE TABLE IF NOT EXISTS quote_last_good (
          symbol text PRIMARY KEY,
          price double precision NOT NULL,
          change double precision NOT NULL DEFAULT 0,
          change_pct double precision NOT NULL DEFAULT 0,
          currency text,
          provider text NOT NULL,
          captured_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      // Broker-call feed (Moneycontrol public headlines) — recent calls we collected, NOT market consensus.
      await db`
        CREATE TABLE IF NOT EXISTS broker_calls (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol text,
          company text NOT NULL,
          broker text NOT NULL,
          action text NOT NULL,
          target_price numeric,
          report_date date NOT NULL,
          tone text,
          tone_score numeric,
          source_url text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_calls_source_url ON broker_calls (source_url)`;
      await db`CREATE INDEX IF NOT EXISTS idx_broker_calls_symbol_date ON broker_calls (symbol, report_date)`;

      // Material NSE corporate announcements (one market-wide fetch per run, filtered to an allow-list).
      await db`
        CREATE TABLE IF NOT EXISTS company_announcements (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol text NOT NULL,
          headline text,
          category text,
          taxonomy_labels text[],
          broadcast_date timestamptz,
          attachment_url text,
          content_hash text UNIQUE,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`ALTER TABLE company_announcements ADD COLUMN IF NOT EXISTS taxonomy_labels text[]`;
      await db`CREATE INDEX IF NOT EXISTS idx_company_announcements_symbol_date ON company_announcements (symbol, broadcast_date DESC)`;

      // Per-collector delta cursor (max article id / broadcast timestamp already ingested).
      await db`
        CREATE TABLE IF NOT EXISTS collector_watermarks (
          collector_id text PRIMARY KEY,
          value text NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      // Quarterly shareholding pattern (NSE master + XBRL). broadcast_date is the filing event time, never estimated from quarter-end.
      await db`
        CREATE TABLE IF NOT EXISTS shareholding (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol text NOT NULL,
          broadcast_date date NOT NULL,
          quarter_end date,
          promoter_pct numeric,
          fii_pct numeric,
          dii_pct numeric,
          public_pct numeric,
          pledge_pct numeric,
          shareholder_count bigint,
          xbrl_url text,
          source text NOT NULL DEFAULT 'NSE',
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (symbol, broadcast_date)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_shareholding_symbol_date ON shareholding (symbol, broadcast_date DESC)`;

      // Credit ratings by agency. Rationale PDFs are linked, never stored.
      await db`
        CREATE TABLE IF NOT EXISTS credit_ratings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol text NOT NULL,
          agency text NOT NULL,
          rating text,
          notch text,
          outlook text,
          watch text,
          action text,
          action_date date,
          rationale_url text,
          source text,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (symbol, agency, action_date)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_credit_ratings_symbol_date ON credit_ratings (symbol, action_date DESC)`;

      // Concall "said vs guided" summaries. Transcript text itself is never stored — only extracted highlights + link.
      await db`
        CREATE TABLE IF NOT EXISTS concall_summaries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol text NOT NULL,
          quarter text,
          transcript_date date,
          guidance text[],
          growth_drivers text[],
          risks text[],
          qa_themes text[],
          tone_prepared numeric,
          tone_qa numeric,
          tone_delta numeric,
          source_url text,
          content_hash text UNIQUE,
          generated_by text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_concall_summaries_symbol_date ON concall_summaries (symbol, transcript_date DESC)`;

      // SEBI orders matched to listed companies. Titles and links only — no legal conclusions are stored.
      await db`
        CREATE TABLE IF NOT EXISTS regulatory_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol text,
          company_name text NOT NULL,
          source text NOT NULL,
          event_type text,
          title text NOT NULL,
          event_date date,
          document_url text,
          case_no text,
          status text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_regulatory_events_doc ON regulatory_events (document_url)`;
      await db`CREATE INDEX IF NOT EXISTS idx_regulatory_events_symbol_date ON regulatory_events (symbol, event_date DESC)`;

      // IPO pipeline funnel, GMP (unofficial, sentiment only) and append-only subscription snapshots.
      await db`
        CREATE TABLE IF NOT EXISTS ipos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          company text NOT NULL,
          symbol text,
          series text,
          stage text,
          issue_size numeric,
          price_band_low numeric,
          price_band_high numeric,
          lot_size bigint,
          open_date date,
          close_date date,
          allotment_date date,
          listing_date date,
          brlms text[],
          drhp_url text,
          top_risks text[],
          objects_breakdown jsonb,
          gmp_value numeric,
          gmp_pct numeric,
          gmp_low numeric,
          gmp_high numeric,
          gmp_sources text[],
          gmp_updated_at timestamptz,
          source text,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (company)
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS ipo_stage_log (
          company text NOT NULL,
          stage text NOT NULL,
          seen_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (company, stage)
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS ipo_subscription_snapshots (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          ipo_id uuid REFERENCES ipos(id),
          snapshot_at timestamptz NOT NULL,
          qib_x numeric,
          nii_x numeric,
          rii_x numeric,
          total_x numeric,
          UNIQUE (ipo_id, snapshot_at)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_ipo_subscription_snapshots_ipo ON ipo_subscription_snapshots (ipo_id, snapshot_at)`;

      // Google Trends (India) interest-over-time snapshots: 0-100 relative interest, NOT search volume.
      await db`
        CREATE TABLE IF NOT EXISTS trend_series (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          keyword text NOT NULL,
          topic_id text,
          fetched_at timestamptz NOT NULL DEFAULT now(),
          series jsonb,
          rising_queries text[],
          UNIQUE (keyword, fetched_at)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_trend_series_keyword_fetched ON trend_series (keyword, fetched_at DESC)`;

      // Daily social/news sentiment aggregates per ticker and source (no raw posts are stored).
      await db`
        CREATE TABLE IF NOT EXISTS sentiment_daily (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol text NOT NULL,
          day date NOT NULL,
          source text NOT NULL,
          mentions int,
          volume_z numeric,
          sentiment_mean numeric,
          sentiment_velocity numeric,
          buzzing boolean,
          bullish_share numeric,
          topics text[],
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (symbol, day, source)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_sentiment_daily_symbol_day ON sentiment_daily (symbol, day DESC)`;

      // -- Gamification: server-side XP ledger (source of truth for points) --
      await db`
        CREATE TABLE IF NOT EXISTS xp_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email text NOT NULL,
          action text NOT NULL,
          points int NOT NULL,
          page text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_email)`;

      // -- Gamification XP economy: daily engagement minutes + referrals --
      await db`
        CREATE TABLE IF NOT EXISTS daily_engagement (
          user_email text NOT NULL,
          day date NOT NULL,
          minutes int NOT NULL DEFAULT 0,
          last_ping timestamptz,
          PRIMARY KEY (user_email, day)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_daily_engagement_day ON daily_engagement(day)`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text UNIQUE`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by text`;
      await db`ALTER TABLE signup_otps ADD COLUMN IF NOT EXISTS referral_code text`;
      await db`
        CREATE TABLE IF NOT EXISTS referrals (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          referrer_email text NOT NULL,
          referee_email text NOT NULL UNIQUE,
          referral_code text NOT NULL,
          status text NOT NULL DEFAULT 'pending',
          created_at timestamptz NOT NULL DEFAULT now(),
          converted_at timestamptz
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_email)`;

      await ensureCompetitionSchema(db);
      schemaReady = true;
    } catch (e) {
      console.warn("Failed to ensure DB schema, continuing in fallback:", e);
    } finally {
      schemaPromise = null;
    }
  })();

  return schemaPromise;
}
