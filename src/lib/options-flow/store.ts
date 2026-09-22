import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import type { OptionsFlowRecord } from "@/lib/options-flow/types";

/** Doc: "Save everything to a dated file so I can compare across days." One dated row per ticker, replaced by DB — Vercel's filesystem is ephemeral. */
export async function saveOptionsFlowRecord(record: OptionsFlowRecord): Promise<void> {
  if (!hasDatabase()) return;
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO options_flow_snapshots (snapshot_date, symbol, instrument_key, record)
    VALUES (${record.date}, ${record.symbol}, ${record.instrumentKey}, ${JSON.stringify(record)}::jsonb)
    ON CONFLICT (snapshot_date, symbol) DO UPDATE SET record = EXCLUDED.record
  `;
}

/** Prior days' records for one symbol, most recent first, excluding today — the baseline the Analysis Agent compares against. */
export async function getOptionsFlowHistory(
  symbol: string,
  beforeDate: string,
  limitDays = 30,
): Promise<OptionsFlowRecord[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT snapshot_date, record FROM options_flow_snapshots
    WHERE symbol = ${symbol} AND snapshot_date < ${beforeDate}
    ORDER BY snapshot_date DESC
    LIMIT ${limitDays}
  `;
  return rows.map((r) => r.record as OptionsFlowRecord);
}

export async function getOptionsFlowRecord(symbol: string, date: string): Promise<OptionsFlowRecord | null> {
  if (!hasDatabase()) return null;
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT record FROM options_flow_snapshots WHERE symbol = ${symbol} AND snapshot_date = ${date} LIMIT 1
  `;
  return rows[0] ? (rows[0].record as OptionsFlowRecord) : null;
}

export async function logOptionsFlowFlag(args: {
  date: string;
  symbol: string;
  headline: string;
  confidence: string;
  priceAtFlag: number | null;
}): Promise<void> {
  if (!hasDatabase()) return;
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO options_flow_flag_log (flagged_date, symbol, headline, confidence, price_at_flag)
    VALUES (${args.date}, ${args.symbol}, ${args.headline}, ${args.confidence}, ${args.priceAtFlag})
    ON CONFLICT (flagged_date, symbol) DO UPDATE SET headline = EXCLUDED.headline, confidence = EXCLUDED.confidence
  `;
}

export type FlagLogRow = {
  flagged_date: string;
  symbol: string;
  headline: string;
  confidence: string;
  price_at_flag: number | null;
};

/** Doc: "Track your flags. Log every one, and note what actually happened over the following two weeks." */
export async function listOptionsFlowFlagLog(limit = 60): Promise<FlagLogRow[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT flagged_date, symbol, headline, confidence, price_at_flag
    FROM options_flow_flag_log
    ORDER BY flagged_date DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    flagged_date: toDateString(r.flagged_date),
    symbol: r.symbol,
    headline: r.headline,
    confidence: r.confidence,
    price_at_flag: r.price_at_flag == null ? null : Number(r.price_at_flag),
  }));
}
