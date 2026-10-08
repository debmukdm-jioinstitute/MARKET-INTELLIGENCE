import { createHash } from "node:crypto";
import { feedFetch } from "@/lib/feeds/http";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { isEarningsTranscript, parseNseSortDate } from "./announcements";
import { detectQuarter, extractHighlights, splitTranscript } from "./concall-nlp";
import type { QaItem } from "@/lib/research/concall-qa";
import { toneScore } from "./concall-tone";
import { today } from "./http";
import type { Collector, CollectorContext, RecordBatch, SeriesResult } from "./types";

/**
 * Concall "said vs guided". Discovery → download once → PDF→text once → split
 * prepared remarks vs Q&A → source-verbatim highlights + in-house lexicon tone
 * (no model, no network). Only highlights and the source link are stored — never the
 * transcript text. Already-processed transcripts are skipped by URL hash, so a
 * PDF is never re-downloaded or re-parsed.
 */

const ID = "concall-summaries";
const MAX_PER_RUN = Number(process.env.CONCALL_MAX_PER_RUN ?? 8);
const BUDGET_MS = Number(process.env.CONCALL_BUDGET_MS ?? 8 * 60_000);
const MAX_PDF_BYTES = 12 * 1024 * 1024;
const PER_COMPANY = 2;
const LOOKBACK_DAYS = Number(process.env.CONCALL_LOOKBACK_DAYS ?? 3);
const IST_MS = 5.5 * 3_600_000;
const NIFTY = new Set(NIFTY_500.map((r) => r[0]));

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/pdf,*/*",
  Referer: "https://www.nseindia.com/",
};

export type Raw = { symbol?: string | null; desc?: string | null; attchmntText?: string | null; attchmntFile?: string | null; sort_date?: string | null };
export type Candidate = { symbol: string; headline: string; url: string; broadcastIso: string };

export const urlKey = (url: string) => `concall:${createHash("sha256").update(url).digest("hex").slice(0, 40)}`;

/** Earnings-call transcripts for Nifty-500 names, max 2 per company, PDFs only, newest first. */
export function findCandidates(raw: Raw[], seen: Record<string, string> = {}, universe: Set<string> | null = NIFTY, perCompanyLimit = PER_COMPANY): Candidate[] {
  const perCompany = new Map<string, number>();
  const out: Candidate[] = [];
  const sorted = [...raw].sort((a, b) => String(b.sort_date).localeCompare(String(a.sort_date)));
  for (const r of sorted) {
    const symbol = r.symbol?.trim().toUpperCase();
    const headline = (r.attchmntText ?? "").replace(/\s+/g, " ").trim();
    const url = r.attchmntFile?.trim();
    const broadcastIso = r.sort_date ? parseNseSortDate(r.sort_date) : null;
    if (!symbol || (universe !== null && !universe.has(symbol)) || !url || !/\.pdf($|\?)/i.test(url) || !broadcastIso) continue;
    if (!isEarningsTranscript(`${r.desc ?? ""} ${headline}`)) continue;
    if (seen[urlKey(url)] && !["no-transcript-text", "no-qa-split", "nothing-extractable", "no-speaker-structure"].includes(seen[urlKey(url)])) continue;
    if ((perCompany.get(symbol) ?? 0) >= perCompanyLimit) continue;
    perCompany.set(symbol, (perCompany.get(symbol) ?? 0) + 1);
    out.push({ symbol, headline, url, broadcastIso });
  }
  return out;
}

const istDmy = (ms: number) => {
  const d = new Date(ms + IST_MS);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
};

async function pdfText(url: string): Promise<string> {
  const res = await feedFetch(url, { headers: BROWSER_HEADERS, timeoutMs: 60_000, attempts: 2 });
  if (!res.ok) throw new Error(`PDF HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_PDF_BYTES) throw new Error("PDF too large");
  const { extractText, getDocumentProxy } = await import("unpdf");
  const { text } = await extractText(await getDocumentProxy(buf), { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

export type ConcallRow = {
  symbol: string;
  quarter: string | null;
  transcriptDate: string | null;
  guidance: string[];
  growthDrivers: string[];
  risks: string[];
  qaThemes: string[];
  qaPairs?: QaItem[];
  tonePrepared: number | null;
  toneQa: number | null;
  sourceUrl: string;
  contentHash: string;
  generatedBy: string;
};

export const TONE_METHOD = "lexicon-tone";

/** Prepared remarks vs Q&A tone, both or neither (a delta needs both). Moderator turns excluded. */
export function toneOfSplit(split: ReturnType<typeof splitTranscript>): { tonePrepared: number | null; toneQa: number | null } {
  const tp = toneScore(split.prepared.map((t) => t.text).join(" "));
  const tq = toneScore(split.qa.filter((t) => t.speaker !== "Moderator").map((t) => t.text).join(" "));
  return tp !== null && tq !== null ? { tonePrepared: tp, toneQa: tq } : { tonePrepared: null, toneQa: null };
}

/** Text → summary row, or a reason it cannot be summarised (cover letter only, no Q&A, scanned image…). */
export async function summarizeTranscript(c: Candidate, text: string, _opts: { hf?: boolean } = {}): Promise<{ row: ConcallRow } | { skip: string }> {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 4000) return { skip: "no-transcript-text" }; // typically a one-page cover letter linking elsewhere
  const split = splitTranscript(text);
  if (split.prepared.length === 0) return { skip: "no-speaker-structure" };
  const hl = extractHighlights(split);
  if (!hl.guidance.length && !hl.growthDrivers.length && !hl.risks.length && !hl.qaThemes.length) return { skip: "nothing-extractable" };

  const generated = ["extractive-rules", ...(!split.found ? ["prepared-only"] : [])];
  const { growthDrivers, risks } = hl;
  const { tonePrepared, toneQa } = toneOfSplit(split);
  if (tonePrepared !== null && toneQa !== null) generated.push(TONE_METHOD);
  return {
    row: {
      symbol: c.symbol,
      quarter: detectQuarter(`${c.headline} ${text}`),
      transcriptDate: c.broadcastIso.slice(0, 10),
      guidance: hl.guidance,
      growthDrivers,
      risks,
      qaThemes: hl.qaThemes,
      qaPairs: hl.qaPairs,
      tonePrepared,
      toneQa,
      sourceUrl: c.url,
      contentHash: createHash("sha256").update(clean).digest("hex"),
      generatedBy: generated.join(" + "),
    },
  };
}

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const seen: Record<string, string> = (await ctx?.watermarks("concall:").catch(() => ({}))) ?? {};
  const now = Date.now();
  const raw = await nseJson<Raw[]>(`/api/corporate-announcements?index=equities&from_date=${istDmy(now - LOOKBACK_DAYS * 86_400_000)}&to_date=${istDmy(now)}`);
  if (!Array.isArray(raw)) throw new Error("NSE corporate-announcements returned a non-array payload");

  const candidates = findCandidates(raw, seen, null);
  const deadline = Date.now() + BUDGET_MS;
  const rows: ConcallRow[] = [];
  const watermarks: Record<string, string> = {};
  const skipped: Record<string, number> = {};
  let failed = 0;

  for (const c of candidates) {
    if (rows.length >= MAX_PER_RUN || Date.now() > deadline) break;
    try {
      const out = await summarizeTranscript(c, await pdfText(c.url));
      if ("row" in out) {
        rows.push(out.row);
        watermarks[urlKey(c.url)] = out.row.contentHash;
      } else {
        skipped[out.skip] = (skipped[out.skip] ?? 0) + 1;
        // Do not permanently blacklist cover letters or previously unsupported formats.
      }
    } catch {
      failed++; // transient (network / PDF): no watermark, retried next run
    }
  }

  if (candidates.length && failed === candidates.length) throw new Error(`all ${failed} transcript downloads/parses failed`);

  const batch: RecordBatch = { table: "concall_summaries", rows: rows as unknown as Record<string, unknown>[], watermarks };
  return [
    {
      id: "concall_summaries_new",
      label: "New concall summaries generated this run",
      unit: "summaries",
      category: "market",
      provider: "NSE India",
      url: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
      obs: [{ date: today(), value: rows.length, meta: { discovered: candidates.length, skipped, failed } }],
      records: batch,
    },
  ];
}

export const concallSummaries: Collector = { id: ID, run, actionsOnly: true, timeoutMs: BUDGET_MS + 120_000 };
