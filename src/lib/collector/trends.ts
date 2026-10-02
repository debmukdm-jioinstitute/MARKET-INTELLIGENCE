import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { feedFetch } from "@/lib/feeds/http";
import { today } from "./http";
import type { Collector, CollectorContext, RecordBatch, SeriesResult } from "./types";

/**
 * Google Trends (India) via the Apify actor `meridianlabs/google-trends-scraper`
 * (pytrends is dead; Google has no public API). Needs APIFY_TOKEN — without it
 * the collector fails LOUDLY ("APIFY_TOKEN missing — Trends skipped") so the
 * source-health monitor shows it, rather than pretending to have run.
 *
 * Cost control (Apify free plan ≈ 1,000 keyword lookups / month): weekly
 * cadence, a rotating batch of TRENDS_BATCH keywords (default 80) plus three
 * market topics, and a hard per-run spend cap. Values are 0–100 RELATIVE
 * interest per keyword, never search volume.
 */

const ID = "google-trends";
const ACTOR = "meridianlabs~google-trends-scraper";
const MIN_INTERVAL_MS = 6 * 24 * 3600_000;
const BATCH = Number(process.env.TRENDS_BATCH ?? 80);
const MAX_SPEND_USD = Number(process.env.TRENDS_MAX_SPEND_USD ?? 1);

/** Market-wide topics always tracked. Key = what we store; term = what we search. */
export const MARKET_TOPICS: { key: string; term: string }[] = [
  { key: "NIFTY50", term: "Nifty 50" },
  { key: "SENSEX", term: "Sensex" },
  { key: "IPO", term: "IPO" },
];

export type TrendsRow = {
  keyword: string;
  status?: string;
  interestOverTime?: { date?: string; value?: number; isPartial?: boolean }[];
  relatedQueries?: { rising?: { query?: string }[] };
  summary?: { momentum?: string | null; recentChangePct?: number | null; yearOnYearChangePct?: number | null };
};

/** "Reliance Industries Ltd." → "Reliance Industries" (what people actually type). */
export const searchTerm = (name: string) => name.replace(/\b(?:ltd|limited)\b\.?/gi, "").replace(/\s+/g, " ").trim();

export type TrendRecord = { keyword: string; topicId: string; fetchedAt: string; series: { points: { d: string; v: number }[]; momentum: string | null; recentChangePct: number | null; yearOnYearChangePct: number | null; geo: "IN" }; risingQueries: string[] };

/** Apify rows → stored records. Only status "ok" rows with real points are kept; no_data / error / skipped are dropped, never filled. */
export function rowsToRecords(rows: TrendsRow[], termToKey: Map<string, string>, fetchedAt: string): { records: TrendRecord[]; dropped: number } {
  const records: TrendRecord[] = [];
  let dropped = 0;
  for (const r of rows) {
    const key = termToKey.get(r.keyword?.toLowerCase());
    const points = (r.interestOverTime ?? []).filter((p) => p.date && typeof p.value === "number" && /^\d{4}-\d{2}-\d{2}/.test(p.date)).map((p) => ({ d: p.date!.slice(0, 10), v: p.value! }));
    if (!key || r.status !== "ok" || points.length < 4) {
      dropped++;
      continue;
    }
    records.push({
      keyword: key,
      topicId: r.keyword,
      fetchedAt,
      series: { points, momentum: r.summary?.momentum ?? null, recentChangePct: r.summary?.recentChangePct ?? null, yearOnYearChangePct: r.summary?.yearOnYearChangePct ?? null, geo: "IN" },
      risingQueries: (r.relatedQueries?.rising ?? []).map((q) => q.query ?? "").filter(Boolean).slice(0, 5),
    });
  }
  return { records, dropped };
}

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN missing — Trends skipped");

  const lastRun = await ctx?.watermark("lastrun:google-trends").catch(() => null);
  const hb = (value: number, meta: Record<string, unknown>, records?: RecordBatch): SeriesResult => ({
    id: "google_trends_keywords",
    label: "Google Trends keywords fetched this run (India)",
    unit: "keywords",
    category: "market",
    provider: "Google Trends via Apify",
    url: "https://trends.google.com/trends/?geo=IN",
    obs: [{ date: today(), value, meta }],
    ...(records ? { records } : {}),
  });
  if (process.env.TRENDS_FORCE !== "1" && lastRun && Date.now() - Date.parse(lastRun) < MIN_INTERVAL_MS) return [hb(0, { skipped: "ran <6 days ago", lastRun })];

  const cursor = Number((await ctx?.watermark("trends:cursor").catch(() => null)) ?? 0) || 0;
  const names = NIFTY_500.map((r) => ({ key: r[0], term: searchTerm(r[1]) }));
  const batch = Array.from({ length: Math.min(BATCH, names.length) }, (_, i) => names[(cursor + i) % names.length]);
  const wanted = [...MARKET_TOPICS, ...batch];
  const termToKey = new Map(wanted.map((w) => [w.term.toLowerCase(), w.key]));

  const res = await feedFetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&maxTotalChargeUsd=${MAX_SPEND_USD}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ keywords: [...new Set(wanted.map((w) => w.term))], geo: "IN", timeRange: "past_12_months", includeRelatedQueries: true, includeRegions: false, maxConcurrency: 5, failOnErrors: false }),
    timeoutMs: 290_000,
    attempts: 1,
  });
  if (!res.ok) throw new Error(`Apify HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 160)}`);
  const rows = (await res.json()) as TrendsRow[];
  if (!Array.isArray(rows)) throw new Error("Apify returned a non-array payload");

  const fetchedAt = new Date().toISOString();
  const { records, dropped } = rowsToRecords(rows, termToKey, fetchedAt);
  if (!records.length) throw new Error(`Apify returned no usable Trends rows (${rows.length} rows, ${dropped} without data)`);

  const watermarks: Record<string, string> = { "trends:cursor": String((cursor + batch.length) % names.length), "lastrun:google-trends": fetchedAt };
  return [hb(records.length, { requested: wanted.length, dropped }, { table: "trend_series", rows: records as unknown as Record<string, unknown>[], watermarks })];
}

export const googleTrends: Collector = { id: ID, run, actionsOnly: true, timeoutMs: 6 * 60_000 };
