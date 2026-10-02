import { createHash } from "node:crypto";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import type { CollectorContext, RecordBatch } from "./types";

/**
 * Validation + persistence for collector event rows (broker calls, NSE
 * announcements). Same honesty rules as the series ingest: malformed rows are
 * dropped, never repaired or invented; an empty batch writes nothing.
 */

export type BrokerCallRow = {
  symbol: string | null;
  company: string;
  broker: string;
  action: string;
  targetPrice: number | null;
  reportDate: string; // YYYY-MM-DD
  tone: "positive" | "negative" | "neutral" | null;
  toneScore: number | null;
  sourceUrl: string;
};

export type AnnouncementRow = {
  symbol: string;
  headline: string;
  category: string;
  broadcastDate: string; // ISO instant
  attachmentUrl: string | null;
  contentHash: string;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const isoDay = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : null;
};

export const announcementHash = (symbol: string, headline: string, broadcastDate: string) =>
  createHash("sha1").update(`${symbol}|${headline}|${broadcastDate}`).digest("hex");

export function cleanBrokerCall(raw: unknown): BrokerCallRow | null {
  if (!isRecord(raw)) return null;
  const company = str(raw.company);
  const broker = str(raw.broker);
  const action = str(raw.action);
  const reportDate = isoDay(raw.reportDate);
  const sourceUrl = str(raw.sourceUrl);
  if (!company || !broker || !action || !reportDate || !sourceUrl) return null;
  const target = num(raw.targetPrice);
  const tone = raw.tone === "positive" || raw.tone === "negative" || raw.tone === "neutral" ? raw.tone : null;
  const score = num(raw.toneScore);
  return {
    symbol: str(raw.symbol)?.toUpperCase() ?? null,
    company,
    broker,
    action,
    targetPrice: target !== null && target > 0 ? target : null,
    reportDate,
    tone,
    toneScore: tone && score !== null && score >= 0 && score <= 1 ? score : null,
    sourceUrl,
  };
}

export function cleanAnnouncement(raw: unknown): AnnouncementRow | null {
  if (!isRecord(raw)) return null;
  const symbol = str(raw.symbol)?.toUpperCase();
  const headline = str(raw.headline);
  const category = str(raw.category);
  const broadcastDate = str(raw.broadcastDate);
  if (!symbol || !headline || !category || !broadcastDate || Number.isNaN(Date.parse(broadcastDate))) return null;
  // Hash is recomputed here so a malformed/forged client hash can never poison dedup.
  return {
    symbol,
    headline,
    category,
    broadcastDate,
    attachmentUrl: str(raw.attachmentUrl),
    contentHash: announcementHash(symbol, headline, broadcastDate),
  };
}

export function cleanRecordBatch(raw: unknown): RecordBatch | null {
  if (!isRecord(raw) || !Array.isArray(raw.rows)) return null;
  const table = raw.table;
  if (table !== "broker_calls" && table !== "company_announcements") return null;
  const cleaner: (r: unknown) => object | null = table === "broker_calls" ? cleanBrokerCall : cleanAnnouncement;
  const rows = raw.rows.map(cleaner).filter((r): r is Record<string, unknown> => r !== null);
  return { table, rows, watermark: str(raw.watermark) ?? undefined };
}

async function setWatermark(id: string, value: string) {
  await sql()`
    INSERT INTO collector_watermarks (collector_id, value, updated_at) VALUES (${id}, ${value}, now())
    ON CONFLICT (collector_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

export async function readWatermark(collectorId: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  try {
    await ensureSchema();
    const rows = (await sql()`SELECT value FROM collector_watermarks WHERE collector_id = ${collectorId}`) as { value: string }[];
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

/** Direct-DB context for the Vercel path (the Actions runner uses an HTTP context instead). */
export const dbContext: CollectorContext = { watermark: readWatermark };

const WATERMARK_KEY: Record<RecordBatch["table"], string> = {
  broker_calls: "broker-calls",
  company_announcements: "nse-announcements",
};

/** Idempotent insert; returns rows actually inserted (duplicates skipped via unique keys). */
export async function saveRecords(batch: RecordBatch): Promise<{ inserted: number; skipped: number }> {
  if (!batch.rows.length) return { inserted: 0, skipped: 0 };
  await ensureSchema();
  const db = sql();
  let inserted = 0;
  for (let i = 0; i < batch.rows.length; i += 100) {
    const chunk = batch.rows.slice(i, i + 100);
    if (batch.table === "broker_calls") {
      const rows = chunk as unknown as BrokerCallRow[];
      // Arrays travel as text[] and are cast in the SELECT (same pattern as saveSeries); NULL elements stay NULL.
      const res = (await db`
        INSERT INTO broker_calls (symbol, company, broker, action, target_price, report_date, tone, tone_score, source_url)
        SELECT t.symbol, t.company, t.broker, t.action, t.target_price::numeric, t.report_date::date, t.tone, t.tone_score::numeric, t.source_url
        FROM unnest(
          ${rows.map((r) => r.symbol)}::text[], ${rows.map((r) => r.company)}::text[], ${rows.map((r) => r.broker)}::text[],
          ${rows.map((r) => r.action)}::text[], ${rows.map((r) => (r.targetPrice === null ? null : String(r.targetPrice)))}::text[],
          ${rows.map((r) => r.reportDate)}::text[], ${rows.map((r) => r.tone)}::text[],
          ${rows.map((r) => (r.toneScore === null ? null : String(r.toneScore)))}::text[], ${rows.map((r) => r.sourceUrl)}::text[]
        ) AS t(symbol, company, broker, action, target_price, report_date, tone, tone_score, source_url)
        ON CONFLICT (source_url) DO NOTHING
        RETURNING id
      `) as unknown[];
      inserted += res.length;
    } else {
      const rows = chunk as unknown as AnnouncementRow[];
      const res = (await db`
        INSERT INTO company_announcements (symbol, headline, category, broadcast_date, attachment_url, content_hash)
        SELECT t.symbol, t.headline, t.category, t.broadcast_date::timestamptz, t.attachment_url, t.content_hash
        FROM unnest(
          ${rows.map((r) => r.symbol)}::text[], ${rows.map((r) => r.headline)}::text[], ${rows.map((r) => r.category)}::text[],
          ${rows.map((r) => r.broadcastDate)}::text[], ${rows.map((r) => r.attachmentUrl)}::text[], ${rows.map((r) => r.contentHash)}::text[]
        ) AS t(symbol, headline, category, broadcast_date, attachment_url, content_hash)
        ON CONFLICT (content_hash) DO NOTHING
        RETURNING id
      `) as unknown[];
      inserted += res.length;
    }
  }
  if (batch.watermark) await setWatermark(WATERMARK_KEY[batch.table], batch.watermark);
  return { inserted, skipped: batch.rows.length - inserted };
}
