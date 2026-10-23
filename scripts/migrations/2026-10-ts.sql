-- TipSheet-grade data layer (CLAUDE_BUILD_SPEC §4). Idempotent. Numeric series live in collected_series/collected_obs (id prefix ts_).
ALTER TABLE collected_series ADD COLUMN IF NOT EXISTS dataset text, ADD COLUMN IF NOT EXISTS freq text, ADD COLUMN IF NOT EXISTS fmt text, ADD COLUMN IF NOT EXISTS topic text, ADD COLUMN IF NOT EXISTS method_url text;
CREATE TABLE IF NOT EXISTS ts_source_files(url text PRIMARY KEY, source_id text NOT NULL, etag text, last_modified text, sha256 text, bytes int, status int, fetched_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS ts_dataset_status(dataset text PRIMARY KEY, latest_obs date, expected_lag_days int NOT NULL, state text CHECK (state IN ('current','behind','failing')), last_run timestamptz, run_ms int, last_error text);
CREATE TABLE IF NOT EXISTS ts_indicator_stats(series_id text PRIMARY KEY, band_lo double precision, band_hi double precision, rec_hi double precision, rec_hi_date date, rec_lo double precision, rec_lo_date date, latest double precision, latest_date date, position text CHECK (position IN ('inside','above','below')), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS ts_events(id text PRIMARY KEY, kind text, symbol text, title text, event_date date, meta jsonb);
CREATE INDEX IF NOT EXISTS collected_obs_series_date ON collected_obs(series_id, obs_date DESC);
