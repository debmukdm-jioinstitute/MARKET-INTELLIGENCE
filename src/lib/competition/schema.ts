import type { NeonQueryFunction } from "@neondatabase/serverless";

/** Called from the repo's central ensureSchema; no separate migration system. */
export function collectCompetitionSchema(ddl: string[]) {
  ddl.push(`CREATE TABLE IF NOT EXISTS competition (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL,
    name text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
    starting_capital numeric NOT NULL DEFAULT 1000000 CHECK (starting_capital = 1000000),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','registration','live','ended')),
    trading_days jsonb NOT NULL, revision int NOT NULL DEFAULT 0,
    finalist_count int NOT NULL CHECK (finalist_count >= 1), results_verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(), CHECK (ends_at > starts_at)
  )`);
  // One standalone season, including concurrent creates.
  ddl.push(`CREATE UNIQUE INDEX IF NOT EXISTS competition_single_season ON competition ((true))`);
  ddl.push(`CREATE TABLE IF NOT EXISTS competition_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competition(id),
    user_email text NOT NULL, display_name text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disqualified')),
    disqualify_reason text, device_hash text NOT NULL, terms_version text NOT NULL,
    email_opt_in boolean NOT NULL DEFAULT false, ledger_version int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (competition_id,user_email), UNIQUE (competition_id,display_name)
  )`);
  ddl.push(`CREATE TABLE IF NOT EXISTS competition_trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competition(id),
    user_email text NOT NULL, symbol text NOT NULL, side text NOT NULL CHECK (side IN ('BUY','SELL')),
    shares numeric NOT NULL CHECK (shares > 0), price numeric NOT NULL CHECK (price > 0),
    gross_value numeric NOT NULL CHECK (gross_value > 0), brokerage numeric NOT NULL CHECK (brokerage >= 0),
    request_id uuid NOT NULL, traded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (competition_id,user_email) REFERENCES competition_participants(competition_id,user_email),
    UNIQUE (competition_id,user_email,request_id)
  )`);
  ddl.push(`CREATE INDEX IF NOT EXISTS competition_trade_user ON competition_trades(competition_id,user_email,traded_at)`);
  ddl.push(`CREATE TABLE IF NOT EXISTS competition_splits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competition(id),
    symbol text NOT NULL, ratio numeric NOT NULL DEFAULT 1 CHECK (ratio > 0),
    dividend numeric NOT NULL DEFAULT 0 CHECK (dividend >= 0), ex_date date NOT NULL,
    UNIQUE (competition_id,symbol,ex_date)
  )`);
  ddl.push(`CREATE TABLE IF NOT EXISTS competition_snapshots (
    competition_id uuid NOT NULL REFERENCES competition(id), user_email text NOT NULL,
    day date NOT NULL, value numeric NOT NULL CHECK (value > 0), prices jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (competition_id,user_email,day)
  )`);
  ddl.push(`CREATE TABLE IF NOT EXISTS competition_instruments (
    symbol text PRIMARY KEY, name text NOT NULL, kind text NOT NULL CHECK (kind IN ('equity','etf')),
    blocked boolean NOT NULL DEFAULT false, circuit_locked boolean NOT NULL DEFAULT true,
    reviewed_at timestamptz NOT NULL DEFAULT now()
  )`);
  ddl.push(`CREATE TABLE IF NOT EXISTS competition_review_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competition(id),
    user_email text NOT NULL, reason text NOT NULL, resolved boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  ddl.push(`CREATE TABLE IF NOT EXISTS competition_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competition(id),
    user_email text NOT NULL, event text NOT NULL CHECK (event IN ('registration','announce','reminder','standings')),
    delivered boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (competition_id,user_email,event)
  )`);
  ddl.push(`CREATE TABLE IF NOT EXISTS competition_certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competition(id),
    user_email text NOT NULL, display_name text NOT NULL, kind text NOT NULL CHECK (kind IN ('Champion','Excellence','Participation')),
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (competition_id,user_email)
  )`);
  ddl.push(`CREATE OR REPLACE FUNCTION competition_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Competition ledger is append-only'; END; $$`);
  ddl.push(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='competition_trades_immutable') THEN
      CREATE TRIGGER competition_trades_immutable BEFORE UPDATE OR DELETE ON competition_trades FOR EACH ROW EXECUTE FUNCTION competition_append_only();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='competition_snapshots_immutable') THEN
      CREATE TRIGGER competition_snapshots_immutable BEFORE UPDATE OR DELETE ON competition_snapshots FOR EACH ROW EXECUTE FUNCTION competition_append_only();
    END IF;
  END $$`);
  // Serialize the commit against status, disqualification, corporate-action revision and other orders.
  ddl.push(`CREATE OR REPLACE FUNCTION competition_commit_order(
    cid uuid, email text, expected_version int, expected_revision int, ticker text,
    direction text, quantity numeric, mark numeric, gross numeric, fee numeric, rid uuid
  ) RETURNS jsonb LANGUAGE plpgsql AS $$
  DECLARE c competition%ROWTYPE; p competition_participants%ROWTYPE; tid uuid; current_day text;
  BEGIN
    SELECT * INTO c FROM competition WHERE id=cid FOR SHARE;
    SELECT * INTO p FROM competition_participants WHERE competition_id=cid AND user_email=email FOR UPDATE;
    SELECT id INTO tid FROM competition_trades WHERE competition_id=cid AND user_email=email AND request_id=rid;
    IF tid IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'tradeId',tid); END IF;
    IF c.status <> 'live' OR clock_timestamp() < c.starts_at OR clock_timestamp() >= c.ends_at THEN
      RETURN jsonb_build_object('ok',false,'error','Competition is not live.','status',409);
    END IF;
    current_day := to_char(clock_timestamp() AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD');
    IF NOT c.trading_days ? current_day OR (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::time < time '09:15'
       OR (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::time >= time '15:30' THEN
      RETURN jsonb_build_object('ok',false,'error','Market session is closed.','status',409);
    END IF;
    IF p.id IS NULL OR p.status <> 'active' THEN RETURN jsonb_build_object('ok',false,'error','Participant is not active.','status',403); END IF;
    IF p.ledger_version <> expected_version OR c.revision <> expected_revision THEN
      RETURN jsonb_build_object('ok',false,'error','Portfolio changed. Refresh and retry.','status',409);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM competition_instruments WHERE symbol=ticker AND NOT blocked AND NOT circuit_locked
      AND reviewed_at > clock_timestamp() - interval '1 day') THEN
      RETURN jsonb_build_object('ok',false,'error','Instrument safety review required.','status',422);
    END IF;
    INSERT INTO competition_trades(competition_id,user_email,symbol,side,shares,price,gross_value,brokerage,request_id)
      VALUES(cid,email,ticker,direction,quantity,mark,gross,fee,rid) RETURNING id INTO tid;
    UPDATE competition_participants SET ledger_version=ledger_version+1 WHERE id=p.id;
    IF EXISTS (SELECT 1 FROM competition_trades WHERE competition_id=cid AND symbol=ticker AND id<>tid
      AND traded_at > clock_timestamp()-interval '5 minutes'
      AND ((user_email=email AND side<>direction) OR (user_email<>email AND side=direction))) THEN
      INSERT INTO competition_review_flags(competition_id,user_email,reason) VALUES(cid,email,'Rapid round trip or synchronized same-symbol activity; investigate, not proof of misconduct.');
    END IF;
    RETURN jsonb_build_object('ok',true,'tradeId',tid);
  END; $$`);
}

/** Standalone entry point (tests, scripts): collect the DDL and apply it in one batch. */
export async function ensureCompetitionSchema(db: NeonQueryFunction<false, false>) {
  const ddl: string[] = [];
  collectCompetitionSchema(ddl);
  await db.transaction(ddl.map((text) => db.query(text)));
}
