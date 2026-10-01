import { nseJson } from "@/lib/feeds/india/nse-session";

/**
 * NSE corporate announcements — the free, keyless IR disclosure feed behind
 * /intelligence/company. Companies publish Regulation 30 filings, concall
 * schedules/transcripts, investor presentations, board outcomes, etc. here;
 * we surface them exactly as filed (headline + original PDF), never summarized
 * or estimated.
 */

export type NseAnnouncement = {
  seqId: string;
  symbol: string;
  companyName: string;
  isin: string | null;
  headline: string;
  category: string;
  /** ISO instant (source timestamps are IST). */
  announcedAt: string;
  pdfUrl: string | null;
};

type RawAnnouncement = {
  seq_id?: string | number | null;
  symbol?: string | null;
  sm_name?: string | null;
  sm_isin?: string | null;
  attchmntText?: string | null;
  desc?: string | null;
  /** "2026-10-01 09:19:18" — exchange timestamps are IST. */
  sort_date?: string | null;
  attchmntFile?: string | null;
};

function parseNseDate(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const t =
    Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se ?? "0")) - 5.5 * 3_600_000; // IST -> UTC
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Latest exchange-wide corporate announcements (equities). Throws on transport or empty payload. */
export async function fetchNseAnnouncements(): Promise<NseAnnouncement[]> {
  const raw = await nseJson<RawAnnouncement[]>("/api/corporate-announcements?index=equities");
  if (!Array.isArray(raw)) throw new Error("NSE corporate-announcements returned a non-array payload");

  const out: NseAnnouncement[] = [];
  for (const r of raw) {
    const seqId = r.seq_id == null ? "" : String(r.seq_id).trim();
    const symbol = str(r.symbol);
    const headline = str(r.attchmntText);
    const announcedAt = r.sort_date ? parseNseDate(r.sort_date) : null;
    if (!seqId || !symbol || !headline || !announcedAt) continue;
    out.push({
      seqId,
      symbol,
      companyName: str(r.sm_name) || symbol,
      isin: str(r.sm_isin) || null,
      headline,
      category: str(r.desc) || "General",
      announcedAt,
      pdfUrl: str(r.attchmntFile) || null,
    });
  }
  if (!out.length) throw new Error("NSE corporate-announcements returned no usable rows");
  return out;
}
