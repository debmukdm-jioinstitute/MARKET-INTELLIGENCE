-- Voice agent tables. Run in Neon AFTER the main schema (src/lib/db.ts
-- ensureSchema) has created users and razorpay_orders.
--
-- users has no numeric id: its primary key is email. voice_* .user_id
-- therefore stores the user's email, not a number.
--
-- New columns for the voice agent. ensureSchema does NOT create these,
-- so this file is the place they come from. Re-running is safe
-- (IF NOT EXISTS).
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS call_consent boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone) WHERE phone IS NOT NULL;

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

-- Voice database user (use its URL as VOICE_DATABASE_URL).
-- NOTE: this is NOT a pure read-only role. The voice routes read users and
-- razorpay_orders, but they also write the voice_* tables (logCall, addDnd,
-- saveLink in src/lib/voice/schema.ts). A read-only role will make
-- /api/voice/outcome and /api/voice/payment-link fail with permission denied.
-- Grant writes ONLY on the voice_* tables, never on users/razorpay_orders:
-- CREATE ROLE voice_ro LOGIN PASSWORD '...';
-- GRANT SELECT ON users, razorpay_orders TO voice_ro;
-- GRANT SELECT, INSERT ON voice_calls, voice_dnd, voice_payment_links TO voice_ro;
