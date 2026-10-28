CREATE TABLE IF NOT EXISTS voice_calls (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  segment TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  result TEXT,
  churn_reason TEXT,
  samvaad_call_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS voice_calls_user_created ON voice_calls (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS voice_dnd (
  phone TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_payment_links (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  link_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Read-only role for voice read endpoints (set a password, then use its URL as VOICE_DATABASE_URL)
-- CREATE ROLE voice_ro LOGIN PASSWORD '...';
-- GRANT SELECT ON users, subscriptions, voice_calls, voice_dnd TO voice_ro;
