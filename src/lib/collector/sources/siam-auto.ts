import { feedFetch } from "@/lib/feeds/http";
import type { Collector, Obs, SeriesResult } from "../types";

/**
 * SIAM monthly auto sales (siam.in press releases). The listing at /news-&-updates/press-releases links
 * each "Auto Industry Performance of <Month>-<Year>" release; the release body states domestic sales per
 * segment ("Passenger Vehicles sales were 4,39,309 units in August 2026") and the DG's commentary gives
 * year-on-year growth ("... with growth of 36.5%"). Layout confirmed live 2026-10-03.
 *
 * Segments published in the text: passenger vehicles, three-wheelers, two-wheelers. Commercial vehicles are
 * NOT in the press-release text (they are in a separate PDF) so they are not collected — never guessed.
 * YoY is only stored when the sentence is found; otherwise only units are written.
 *
 * Env: SIAM_RELEASES (default 1) — how many latest monthly releases to read (one-time backfill).
 */

const LISTING = "https://www.siam.in/news-%26-updates/press-releases";
const ORIGIN = "https://www.siam.in";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export const SEGMENTS = [
  { key: "pv", label: "Passenger vehicles", sales: /Passenger\s+Vehicles\s*\d*\s+sales\s+were\s+([\d,]+)\s+units\s+in\s+([A-Za-z]+)\s+(\d{4})/i, yoy: /Passenger\s+Vehicles\s+posted\s+sales\s+of[^%]*?(growth|decline|de-?growth|degrowth)\s+of\s+([\d.]+)\s*%/i },
  { key: "3w", label: "Three-wheelers", sales: /Three[-\s]wheelers?\s+sales\s+were\s+([\d,]+)\s+units\s+in\s+([A-Za-z]+)\s+(\d{4})/i, yoy: /Three\s+Wheelers\s+sales\s+recorded[^%]*?(growth|decline|de-?growth|degrowth)\s+of\s+([\d.]+)\s*%/i },
  { key: "2w", label: "Two-wheelers", sales: /Two[-\s]wheelers?\s+sales\s+were\s+([\d,]+)\s+units\s+in\s+([A-Za-z]+)\s+(\d{4})/i, yoy: /Two\s+Wheelers\s+Sales\s+logged[^%]*?(growth|decline|de-?growth|degrowth)\s+of\s+([\d.]+)\s*%/i },
] as const;

const strip = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/\s+/g, " ");

/** Parse one release body into per-segment units (+ YoY when stated). Exported for tests. */
export function parseSiamRelease(html: string): { month: string; seg: { key: string; label: string; units: number; yoy?: number }[] } | null {
  const t = strip(html);
  const seg: { key: string; label: string; units: number; yoy?: number }[] = [];
  let month: string | null = null;
  for (const s of SEGMENTS) {
    const m = s.sales.exec(t);
    if (!m) continue;
    const mi = MONTHS.indexOf(m[2]!.toLowerCase());
    if (mi < 0) continue;
    const mon = `${m[3]}-${String(mi + 1).padStart(2, "0")}-01`;
    if (month && month !== mon) return null; // segments disagree on the month → layout not understood
    month = mon;
    const units = Number(m[1]!.replace(/,/g, ""));
    if (!Number.isFinite(units) || units < 1_000 || units > 50_000_000) continue;
    const y = s.yoy.exec(t);
    const yoy = y ? (/decline|de-?growth|degrowth/i.test(y[1]!) ? -1 : 1) * Number(y[2]) : undefined;
    seg.push({ key: s.key, label: s.label, units, ...(yoy !== undefined && Number.isFinite(yoy) && Math.abs(yoy) < 200 ? { yoy } : {}) });
  }
  return month && seg.length ? { month, seg } : null;
}

export const siamAuto: Collector = {
  id: "siam-auto",
  actionsOnly: true,
  async run() {
    const listRes = await feedFetch(LISTING, { timeoutMs: 25_000 });
    if (!listRes.ok) throw new Error(`siam-auto: listing HTTP ${listRes.status}`);
    const html = await listRes.text();
    const links = [...new Set([...html.matchAll(/href="(\/news-(?:&|&amp;)-updates\/press-releases\/auto-industry-performance-of-[a-z0-9-]+\/\d+)"/gi)].map((m) => m[1]!.replace(/&amp;/g, "&")))];
    if (!links.length) throw new Error("siam-auto: no 'Auto Industry Performance' release on the listing (layout changed?)");

    const n = Math.max(1, Number(process.env.SIAM_RELEASES) || 1);
    const units = new Map<string, Obs[]>();
    const yoy = new Map<string, Obs[]>();
    const urls = new Map<string, string>();
    for (const path of links.slice(0, n)) {
      const url = `${ORIGIN}${path.replace(/&/g, "%26")}`;
      const res = await feedFetch(url, { timeoutMs: 25_000 });
      if (!res.ok) throw new Error(`siam-auto: release HTTP ${res.status} (${path})`);
      const parsed = parseSiamRelease(await res.text());
      if (!parsed) throw new Error(`siam-auto: could not parse segment sales in ${path} (layout changed?)`);
      for (const s of parsed.seg) {
        (units.get(s.key) ?? units.set(s.key, []).get(s.key)!).push({ date: parsed.month, value: s.units, meta: { source: url } });
        if (s.yoy !== undefined) (yoy.get(s.key) ?? yoy.set(s.key, []).get(s.key)!).push({ date: parsed.month, value: s.yoy, meta: { source: url } });
        urls.set(s.key, url);
      }
      if (links.length > 1) await new Promise((r) => setTimeout(r, 500));
    }

    const out: SeriesResult[] = [];
    for (const s of SEGMENTS) {
      const u = units.get(s.key);
      if (!u?.length) continue;
      out.push({ id: `auto_${s.key}_units`, label: `${s.label} — domestic sales`, unit: "units", category: "macro", provider: "SIAM", url: urls.get(s.key) ?? LISTING, obs: u });
      const y = yoy.get(s.key);
      if (y?.length) out.push({ id: `auto_${s.key}_yoy_pct`, label: `${s.label} — sales growth vs same month last year`, unit: "% YoY", category: "macro", provider: "SIAM", url: urls.get(s.key) ?? LISTING, obs: y });
    }
    return out;
  },
};
