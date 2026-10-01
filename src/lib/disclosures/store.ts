import { hasDatabase, sql } from "@/lib/db";
import type { NseAnnouncement } from "./nse";

/**
 * Storage for exchange-published company disclosures (NSE corporate
 * announcements). Honesty rules, same spirit as the numeric collectors:
 * - Rows are keyed by the exchange's own seq_id — re-ingests are idempotent upserts.
 * - An empty payload is a no-op: it never deletes or overwrites last-good rows.
 * - Old rows are pruned (90-day window) so the table stays small.
 * - Read helpers never throw: a missing/unreachable DB yields [] and the page
 *   falls back to its honest empty state.
 */

export type DisclosureRow = {
  seqId: string;
  symbol: string;
  companyName: string;
  isin: string | null;
  headline: string;
  category: string;
  announcedAt: string;
  pdfUrl: string | null;
};

let ready: Promise<void> | null = null;

export function ensureDisclosuresSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS company_disclosures (
        seq_id text PRIMARY KEY,
        symbol text NOT NULL,
        company_name text NOT NULL,
        isin text,
        headline text NOT NULL,
        category text NOT NULL,
        announced_at timestamptz NOT NULL,
        pdf_url text,
        source text NOT NULL DEFAULT 'NSE',
        fetched_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_disclosures_time ON company_disclosures (announced_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS idx_disclosures_symbol ON company_disclosures (symbol)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/** Idempotent upsert of exchange-filed disclosures. Returns rows written. */
export async function saveDisclosures(items: NseAnnouncement[]): Promise<number> {
  if (!items.length || !hasDatabase()) return 0;
  await ensureDisclosuresSchema();
  const db = sql();
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    await db`
      INSERT INTO company_disclosures (seq_id, symbol, company_name, isin, headline, category, announced_at, pdf_url, source, fetched_at)
      SELECT s::text, y::text, n::text, i::text, h::text, c::text, a::timestamptz, p::text, 'NSE', now()
      FROM unnest(
        ${chunk.map((x) => x.seqId)}::text[],
        ${chunk.map((x) => x.symbol)}::text[],
        ${chunk.map((x) => x.companyName)}::text[],
        ${chunk.map((x) => x.isin)}::text[],
        ${chunk.map((x) => x.headline)}::text[],
        ${chunk.map((x) => x.category)}::text[],
        ${chunk.map((x) => x.announcedAt)}::text[],
        ${chunk.map((x) => x.pdfUrl)}::text[]
      ) AS t(s, y, n, i, h, c, a, p)
      ON CONFLICT (seq_id) DO UPDATE SET
        headline = EXCLUDED.headline,
        category = EXCLUDED.category,
        pdf_url = EXCLUDED.pdf_url,
        fetched_at = now()
    `;
  }
  return items.length;
}

/** Drop rows older than 90 days. Returns rows deleted. */
export async function pruneDisclosures(): Promise<number> {
  if (!hasDatabase()) return 0;
  await ensureDisclosuresSchema();
  const rows = await sql()`DELETE FROM company_disclosures WHERE announced_at < now() - interval '90 days' RETURNING seq_id`;
  return rows.length;
}

function rowToDisclosure(r: Record<string, unknown>): DisclosureRow {
  return {
    seqId: String(r.seq_id),
    symbol: String(r.symbol),
    companyName: String(r.company_name),
    isin: r.isin == null ? null : String(r.isin),
    headline: String(r.headline),
    category: String(r.category),
    announcedAt:
      r.announced_at instanceof Date ? r.announced_at.toISOString() : String(r.announced_at),
    pdfUrl: r.pdf_url == null ? null : String(r.pdf_url),
  };
}

/** Newest disclosures first. Never throws — [] on any DB problem. */
export async function latestDisclosures(limit = 40): Promise<DisclosureRow[]> {
  try {
    if (!hasDatabase()) return [];
    await ensureDisclosuresSchema();
    const rows = await sql()`
      SELECT seq_id, symbol, company_name, isin, headline, category, announced_at, pdf_url
      FROM company_disclosures
      ORDER BY announced_at DESC
      LIMIT ${Math.min(Math.max(limit, 1), 200)}
    `;
    return rows.map(rowToDisclosure);
  } catch {
    return [];
  }
}

/** Freshness signal for the page trust line. Never throws. */
export async function disclosuresMeta(): Promise<{ count: number; latestAt: string | null }> {
  try {
    if (!hasDatabase()) return { count: 0, latestAt: null };
    await ensureDisclosuresSchema();
    const rows = await sql()`SELECT COUNT(*)::int AS n, MAX(announced_at) AS latest FROM company_disclosures`;
    const r = rows[0] as { n: number; latest: Date | null } | undefined;
    return {
      count: r?.n ?? 0,
      latestAt: r?.latest instanceof Date ? r.latest.toISOString() : null,
    };
  } catch {
    return { count: 0, latestAt: null };
  }
}
