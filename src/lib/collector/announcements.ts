import { nseJson } from "@/lib/feeds/india/nse-session";
import { today } from "./http";
import { announcementHash } from "./record-tables";
import { labelHeadlines } from "./taxonomy";
import type { Collector, CollectorContext, SeriesResult } from "./types";

/**
 * NSE corporate announcements — ONE market-wide fetch per run (yesterday→today,
 * IST; a day is ~450 equities rows, never per-ticker), filtered to a material
 * allow-list. Attachments stay as NSE-archive PDF URLs; bodies are not downloaded.
 */

const ID = "nse-announcements";

export type AnnouncementRow = {
  symbol: string;
  headline: string;
  category: string;
  taxonomyLabels: string[] | null;
  broadcastDate: string; // ISO instant
  attachmentUrl: string | null;
  contentHash: string;
};
const IST_MS = 5.5 * 3_600_000;

type Raw = {
  symbol?: string | null;
  desc?: string | null;
  attchmntText?: string | null;
  attchmntFile?: string | null;
  sort_date?: string | null;
};

/** Transcript of an earnings / analyst-meet call. AGM / postal-ballot transcripts are routine and excluded. Shared with the concall collector. */
export const isEarningsTranscript = (text: string) => /\btranscripts?\b/i.test(text) && !/\b(?:annual general meeting|AGM|postal ballot)\b/i.test(text);

/** Ordered: first match wins, most specific first. Everything unmatched is routine noise and dropped. */
const MATERIAL: [category: string, re: RegExp][] = [
  ["Pledge disclosure", /pledg|encumbran/i],
  ["Insider trading", /insider trading|prohibition of insider/i],
  ["Credit rating", /credit rating/i],
  ["Financial results", /financial results?|quarterly results?|unaudited.*results?|audited.*results?/i],
  ["Dividend / bonus / split", /dividend|bonus|stock split|sub-?division of (?:equity )?shares|split of (?:equity )?shares/i],
  ["Buyback / rights offer", /buy-?back|rights issue|rights entitlement|right entitlement/i],
  ["M&A / restructuring", /acquisition|amalgamation|merger|scheme of arrangement|demerger|disposal|divest|restructur|takeover|open offer|slump sale/i],
  ["Management change", /change in director|change in management|appointment|resignation|cessation|key managerial|senior management/i],
  ["Board meeting", /board meeting/i],
];

/** Routine compliance chatter that merely cites a material regulation (e.g. trading-window closures cite the insider-trading rules). */
const ROUTINE = /trading window/i;

/** desc (NSE's own category) is checked first, then the headline, so "General Updates" that announce results still land. */
export function categorize(desc: string, headline: string): string | null {
  if (ROUTINE.test(desc) || ROUTINE.test(headline)) return null;
  if (isEarningsTranscript(`${desc} ${headline}`)) return "Earnings call transcript";
  for (const text of [desc, headline]) {
    for (const [cat, re] of MATERIAL) if (re.test(text)) return cat;
  }
  return null;
}

/** "2026-10-02 23:55:12" (IST) → ISO instant. */
export function parseNseSortDate(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? "0")) - IST_MS;
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const istDmy = (ms: number) => {
  const d = new Date(ms + IST_MS);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
};

export function selectMaterial(raw: Raw[], watermarkIso: string | null): { rows: AnnouncementRow[]; maxDate: string | null } {
  const seen = new Set<string>();
  const rows: AnnouncementRow[] = [];
  let maxDate: string | null = null;
  for (const r of raw) {
    const symbol = r.symbol?.trim().toUpperCase();
    const headline = r.attchmntText?.replace(/\s+/g, " ").trim();
    const broadcastDate = r.sort_date ? parseNseSortDate(r.sort_date) : null;
    if (!symbol || !headline || !broadcastDate) continue;
    const category = categorize(r.desc?.trim() ?? "", headline);
    if (!category) continue;
    if (watermarkIso && broadcastDate < watermarkIso) continue; // delta: already ingested (equal timestamps pass; hash dedup catches repeats)
    const contentHash = announcementHash(symbol, headline, broadcastDate);
    if (seen.has(contentHash)) continue;
    seen.add(contentHash);
    if (!maxDate || broadcastDate > maxDate) maxDate = broadcastDate;
    rows.push({ symbol, headline, category, taxonomyLabels: null, broadcastDate, attachmentUrl: r.attchmntFile?.trim() || null, contentHash });
  }
  return { rows, maxDate };
}

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const prev = (await ctx?.watermark(ID).catch(() => null)) ?? null;
  const prevIso = prev && !Number.isNaN(Date.parse(prev)) ? prev : null;

  const now = Date.now();
  const path = `/api/corporate-announcements?index=equities&from_date=${istDmy(now - 86_400_000)}&to_date=${istDmy(now)}`;
  const raw = await nseJson<Raw[]>(path);
  if (!Array.isArray(raw)) throw new Error("NSE corporate-announcements returned a non-array payload");
  // SME board is best-effort: a failure here never fails the main equities fetch.
  const sme = await nseJson<Raw[]>(path.replace("index=equities", "index=sme")).catch(() => []);
  if (Array.isArray(sme)) raw.push(...sme);

  const { rows, maxDate } = selectMaterial(raw, prevIso);
  // Second pass (time-boxed): zero-shot taxonomy labels for the risk checklist. Base ingest stays valid without them.
  const labels = await labelHeadlines(rows.map((r) => r.headline));
  rows.forEach((r, i) => {
    r.taxonomyLabels = labels[i];
  });
  const watermark = [prevIso, maxDate].filter((x): x is string => Boolean(x)).sort().pop();
  return [
    {
      id: "nse_announcements_material",
      label: "Material NSE announcements in the last 2 days (market-wide)",
      unit: "filings",
      category: "market",
      provider: "NSE India",
      url: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
      obs: [{ date: today(), value: selectMaterial(raw, null).rows.length, meta: { fetched: raw.length, newThisRun: rows.length } }],
      records: { table: "company_announcements", rows: rows as unknown as Record<string, unknown>[], watermark },
    },
  ];
}

export const nseAnnouncements: Collector = { id: ID, run, actionsOnly: true };
