#!/usr/bin/env tsx
/**
 * Oracle Always Free: liveness heartbeat (runs every 5 min via cron).
 *
 * Two-layer dead-man's-switch for a VM we cannot SSH into:
 *   1. /opt/mi/heartbeat.log — appended by /opt/mi/bin/heartbeat-wrapper.sh in
 *      BASH *before* this script runs, so a timestamp lands even if Node/tsx
 *      is broken. (This .ts file does NOT touch the log file.)
 *   2. oracle_heartbeat table in Postgres — INSERTed here. This is the "VM is
 *      alive" proof the user checks from the Neon SQL editor:
 *        SELECT * FROM oracle_heartbeat ORDER BY ts DESC LIMIT 5;
 *
 * Honest note: this heartbeat is primarily OUR liveness signal. The work that
 * actually keeps the instance busy (and safe from Oracle's idle-reclamation
 * policy) is the real job load: trade-lab slices every 15 min on weekdays,
 * smart-notify every 30 min, collectors twice daily, etc.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/heartbeat.ts
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; optional —
 *       without it the script logs a skip and exits 0; the heartbeat.log
 *       append from the wrapper remains the fallback signal)
 *
 * This script exits 0 ALWAYS — a heartbeat must never crash-loop.
 */
import { hasDatabase, sql } from "@/lib/db";

const SCRIPT = "heartbeat";

async function main(): Promise<void> {
  if (!hasDatabase()) {
    console.log(
      JSON.stringify({
        ok: true,
        script: SCRIPT,
        db: "skipped — DATABASE_URL / POSTGRES_URL / DATABASE_URL_UNPOOLED is not set (heartbeat.log append is the fallback)",
      }),
    );
    return;
  }
  try {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS oracle_heartbeat (
        ts timestamptz PRIMARY KEY DEFAULT now(),
        note text NOT NULL DEFAULT ''
      )`;
    await db`INSERT INTO oracle_heartbeat (ts, note) VALUES (now(), 'oracle-vm')`;
    console.log(JSON.stringify({ ok: true, script: SCRIPT, db: "inserted" }));
  } catch (e) {
    // Never crash-loop: a failing heartbeat is still information (it shows up
    // in /opt/mi/logs/heartbeat.log). Exit 0.
    console.error(
      JSON.stringify({
        ok: false,
        script: SCRIPT,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
  }
}

main().then(
  () => process.exit(0),
  () => process.exit(0),
);
