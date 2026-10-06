import { createHash } from "node:crypto";
import { feedFetch } from "@/lib/feeds/http";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { extractObjects, extractTopRisks } from "./drhp";
import { extractCover, type DrhpCover } from "./drhp-cover";
import { fetchGmpSources, gmpFor, type GmpSet } from "./ipo-gmp";
import { getText, today } from "./http";
import { IPO_STAGES } from "./record-tables";
import type { Collector, CollectorContext, RecordBatch, SeriesResult } from "./types";

/**
 * IPO funnel: DRHP filed → SEBI nod (RHP filed / dates announced) → Open →
 * Allotment → Listed. The pipeline is tiny (dozens of IPOs), so every run is a
 * full refresh upserted by normalised company name; first-seen stage times go
 * to ipo_stage_log. Subscription snapshots are append-only. DRHP/RHP PDFs are
 * parsed once ever (watermarked). GMP is sentiment only (see ipo-gmp.ts).
 */

const ID = "ipos";
const BUDGET_MS = Number(process.env.IPOS_BUDGET_MS ?? 6 * 60_000);
const DRHP_MAX_PER_RUN = Number(process.env.IPOS_DRHP_MAX ?? 6);
const MAX_PDF_BYTES = 40 * 1024 * 1024;
const PAST_WINDOW_DAYS = 75;

export type Stage = (typeof IPO_STAGES)[number];
const RANK: Record<string, number> = Object.fromEntries(IPO_STAGES.map((s, i) => [s, i + 1]));

const SEBI_LIST = (smid: number) => `https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=${smid}`;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

/* ------------------------------------------------------------------ */
/* Names, dates, prices                                                */
/* ------------------------------------------------------------------ */

const SMALL = new Set(["of", "and", "the", "in", "for"]);
/** "VISHAL NIRMITI LIMITED" / "Vishal Nirmiti Ltd." → "Vishal Nirmiti" (one canonical, source-independent display key). */
export function cleanCompany(raw: string): string {
  const base = raw
    .replace(/&amp;/g, "&")
    .replace(/\b(?:private|pvt|limited|ltd)\b\.?/gi, " ")
    .replace(/[.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base
    .split(" ")
    .map((w, i) => (SMALL.has(w.toLowerCase()) && i > 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}
export const companyKey = (raw: string) => cleanCompany(raw).toLowerCase().replace(/[^a-z0-9]+/g, "");

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** "30-Sep-2026" / "30-SEP-2026" → "2026-09-30"; "-" / junk → null. */
export function nseDay(s: string | null | undefined): string | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec((s ?? "").trim());
  const mi = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  return m && mi >= 0 ? `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/** "Rs.208 to Rs.220" → {208, 220}; "Rs.1000" / "   405" → both. */
export function priceBand(s: string | null | undefined): { low: number | null; high: number | null } {
  const nums = (s ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) return { low: null, high: null };
  return { low: Math.min(...nums), high: Math.max(...nums) };
}

const num = (v: unknown): number | null => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return String(v ?? "").trim() !== "" && Number.isFinite(n) ? n : null;
};

/* ------------------------------------------------------------------ */
/* NSE shapes                                                          */
/* ------------------------------------------------------------------ */

type NseUpcoming = { companyName?: string; issueStartDate?: string; issueEndDate?: string; issuePrice?: string; issueSize?: string; series?: string; status?: string; symbol?: string; isBse?: string };
type NsePast = { company?: string; symbol?: string; ipoStartDate?: string; ipoEndDate?: string; priceRange?: string; issuePrice?: string; listingDate?: string; securityType?: string };
type NseCurrent = NseUpcoming & { noOfTime?: string };
type CatRow = { category?: string; noOfTotalMeant?: string; srNo?: string | null };
type DetailItem = { title?: string | null; value?: string | null };

export type IpoRec = {
  company: string;
  symbol: string | null;
  series: string | null;
  isBse: boolean;
  stage: Stage;
  issueSize: number | null;
  priceBandLow: number | null;
  priceBandHigh: number | null;
  lotSize: number | null;
  openDate: string | null;
  closeDate: string | null;
  listingDate: string | null;
  brlms: string[] | null;
  drhpUrl: string | null;
  sebiPage: string | null; // SEBI filing page holding the DRHP/RHP PDF
  source: string;
};

const mergeRec = (a: IpoRec | undefined, b: IpoRec): IpoRec => {
  if (!a) return b;
  const hi = RANK[b.stage] > RANK[a.stage] ? b : a;
  const lo = hi === a ? b : a;
  return { ...lo, ...Object.fromEntries(Object.entries(hi).filter(([, v]) => v !== null && v !== undefined)), drhpUrl: a.drhpUrl ?? b.drhpUrl, sebiPage: b.sebiPage ?? a.sebiPage, source: [...new Set([a.source, b.source])].join("+") } as IpoRec;
};

export function fromUpcoming(r: NseUpcoming): IpoRec | null {
  const series = r.series?.toUpperCase();
  if (!r.companyName || (series !== "EQ" && series !== "SME")) return null; // DEBT / others are not IPOs
  const { low, high } = priceBand(r.issuePrice);
  const shares = num(r.issueSize);
  return {
    company: cleanCompany(r.companyName),
    symbol: r.symbol ?? null,
    series,
    isBse: r.isBse === "1",
    stage: r.status?.toLowerCase() === "active" ? "open" : "sebi_nod",
    issueSize: shares && high ? Math.round((shares * high) / 1e5) / 100 : null, // ₹ crore
    priceBandLow: low,
    priceBandHigh: high,
    lotSize: null,
    openDate: nseDay(r.issueStartDate),
    closeDate: nseDay(r.issueEndDate),
    listingDate: null,
    brlms: null,
    drhpUrl: null,
    sebiPage: null,
    source: "NSE",
  };
}

export function fromPast(r: NsePast, nowMs = Date.now()): IpoRec | null {
  const series = r.securityType?.toUpperCase();
  const end = nseDay(r.ipoEndDate);
  if (!r.company || !end || (series !== "EQ" && series !== "SME")) return null;
  if (nowMs - Date.parse(`${end}T00:00:00Z`) > PAST_WINDOW_DAYS * 86_400_000) return null;
  const listing = nseDay(r.listingDate);
  const { low, high } = priceBand(r.priceRange);
  return {
    company: cleanCompany(r.company),
    symbol: r.symbol ?? null,
    series,
    isBse: false,
    stage: listing ? "listed" : "allotment",
    issueSize: null,
    priceBandLow: low,
    priceBandHigh: high,
    lotSize: null,
    openDate: nseDay(r.ipoStartDate),
    closeDate: end,
    listingDate: listing,
    brlms: null,
    drhpUrl: null,
    sebiPage: null,
    source: "NSE",
  };
}

/** SEBI "Public Issues" row: href = filing page, title = "COMPANY - DRHP <br>…" (HTML inside the attribute). */
export function parseSebiFilings(html: string, kind: "DRHP" | "RHP"): { company: string; date: string; page: string }[] {
  const out: { company: string; date: string; page: string }[] = [];
  for (const m of html.matchAll(/<td>\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s*<\/td>\s*<td>\s*<a href="([^"]+)"[^>]*?title="([^"]*)"/g)) {
    const title = m[3].split(/<br/i)[0].replace(/&amp;/g, "&").trim();
    const t = new RegExp(`^(.+?)\\s+-\\s+${kind}\\s*$`, "i").exec(title); // skips "Addendum to DRHP", "Corrigendum…"
    const d = /^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/.exec(m[1].trim());
    const mi = d ? MONTHS.indexOf(d[1].toLowerCase()) : -1;
    if (t && d && mi >= 0) out.push({ company: t[1], date: `${d[3]}-${String(mi + 1).padStart(2, "0")}-${d[2].padStart(2, "0")}`, page: m[2] });
  }
  return out;
}

/** Subscription multiples from NSE's per-category table (QIB = srNo 1, NII = 2, RII = 3, Total = last). */
export function subscriptionFrom(rows: CatRow[]): { qibX: number | null; niiX: number | null; riiX: number | null; totalX: number | null } {
  const x = (pred: (r: CatRow) => boolean) => num(rows.find(pred)?.noOfTotalMeant);
  return {
    qibX: x((r) => r.srNo === "1"),
    niiX: x((r) => r.srNo === "2"),
    riiX: x((r) => r.srNo === "3"),
    totalX: x((r) => r.category === "Total"),
  };
}

export function detailFrom(items: DetailItem[]): { brlms: string[] | null; lotSize: number | null } {
  const val = (t: string) => items.find((i) => i.title?.toLowerCase().startsWith(t.toLowerCase()))?.value ?? "";
  const brlms = val("Book Running Lead Managers")
    .replace(/^"|"$/g, "")
    .split(/\s*(?:,|;|\band\b|&)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  const lot = /(\d[\d,]*)/.exec(val("Bid Lot"));
  return { brlms: brlms.length ? brlms : null, lotSize: lot ? Number(lot[1].replace(/,/g, "")) : null };
}

/* ------------------------------------------------------------------ */
/* DRHP / RHP analysis (once per IPO)                                  */
/* ------------------------------------------------------------------ */

async function sebiPdfUrl(page: string): Promise<string | null> {
  const html = await getText(page, { headers: HEADERS, timeoutMs: 30_000 });
  const m = /[?&]file=(https?:\/\/[^'"&\s]+\.pdf)/i.exec(html) ?? /href=['"](https?:\/\/[^'"]+\.pdf)['"]/i.exec(html);
  return m ? decodeURIComponent(m[1]) : null;
}

async function analyse(page: string): Promise<{ topRisks: string[]; objects: ReturnType<typeof extractObjects>; cover: DrhpCover } | null> {
  const pdf = await sebiPdfUrl(page);
  if (!pdf) return null;
  const res = await feedFetch(pdf, { headers: HEADERS, timeoutMs: 150_000, attempts: 2 });
  if (!res.ok) throw new Error(`prospectus HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_PDF_BYTES) return null;
  const { extractText, getDocumentProxy } = await import("unpdf");
  const { text } = await extractText(await getDocumentProxy(buf), { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const topRisks = extractTopRisks(pages);
  const objects = extractObjects(pages);
  const cover = extractCover(pages); // first pages only: lead managers + offer size
  const hasCover = cover.brlms.length > 0 || cover.offer.structure !== null;
  return topRisks.length || objects.objects.length || hasCover ? { topRisks, objects, cover } : null;
}

// v2: the cover (lead managers, offer size) is parsed too, so every prospectus is read once more.
const WATERMARK_PREFIX = "ipo-drhp2:";
const hashKey = (company: string) => `${WATERMARK_PREFIX}${createHash("sha256").update(companyKey(company)).digest("hex").slice(0, 40)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hourFloor = (ms: number) => new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString();

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const deadline = now + BUDGET_MS;
  const seenDrhp: Record<string, string> = (await ctx?.watermarks(WATERMARK_PREFIX).catch(() => ({}))) ?? {};

  /* 1) pipeline sources ------------------------------------------------ */
  const [upcoming, current, past] = await Promise.all([
    nseJson<NseUpcoming[]>("/api/all-upcoming-issues?category=ipo").catch(() => null),
    nseJson<NseCurrent[]>("/api/ipo-current-issue").catch(() => null),
    nseJson<NsePast[]>("/api/public-past-issues?category=ipo").catch(() => null),
  ]);
  const [drhpHtml, rhpHtml] = await Promise.all([getText(SEBI_LIST(10), { headers: HEADERS, timeoutMs: 30_000 }).catch(() => null), getText(SEBI_LIST(11), { headers: HEADERS, timeoutMs: 30_000 }).catch(() => null)]);
  if (!upcoming && !past && !drhpHtml && !rhpHtml) throw new Error("NSE and SEBI IPO sources all unreachable");

  const recs = new Map<string, IpoRec>();
  const put = (r: IpoRec | null) => r && recs.set(companyKey(r.company), mergeRec(recs.get(companyKey(r.company)), r));
  const blank = (company: string, stage: Stage, source: string, page: string | null): IpoRec => ({ company: cleanCompany(company), symbol: null, series: null, isBse: false, stage, issueSize: null, priceBandLow: null, priceBandHigh: null, lotSize: null, openDate: null, closeDate: null, listingDate: null, brlms: null, drhpUrl: null, sebiPage: page, source });

  const filingSeen = (company: string, page: string) => recs.get(companyKey(company))?.sebiPage ?? page;
  for (const f of drhpHtml ? parseSebiFilings(drhpHtml, "DRHP") : []) put({ ...blank(f.company, "drhp_filed", "SEBI", f.page), drhpUrl: f.page });
  for (const f of rhpHtml ? parseSebiFilings(rhpHtml, "RHP") : []) put({ ...blank(f.company, "sebi_nod", "SEBI", filingSeen(f.company, f.page)), sebiPage: f.page, drhpUrl: null });
  for (const r of past ?? []) put(fromPast(r, now));
  for (const r of upcoming ?? []) put(fromUpcoming(r));

  // Ensure every active issue carries its live Total multiple even when per-category data is unavailable.
  const currentBySymbol = new Map((current ?? []).map((c) => [c.symbol, c]));

  /* 2) detail (BRLMs, lot size) + subscription snapshots for live issues  */
  const snapshots: Record<string, unknown>[] = [];
  const live = [...recs.values()].filter((r) => (r.stage === "open" || r.stage === "sebi_nod") && r.symbol && !r.isBse);
  for (const r of live) {
    if (Date.now() > deadline) break;
    const series = r.series === "SME" ? "SME" : "EQ";
    try {
      const d = await nseJson<{ issueInfo?: { dataList?: DetailItem[] } }>(`/api/ipo-detail?symbol=${encodeURIComponent(r.symbol!)}&series=${series}&issueType=IPO`);
      const { brlms, lotSize } = detailFrom(d.issueInfo?.dataList ?? []);
      r.brlms = brlms;
      r.lotSize = lotSize;
    } catch {
      /* detail is best-effort */
    }
    if (r.stage === "open") {
      try {
        const c = await nseJson<{ dataList?: CatRow[] }>(`/api/ipo-active-category?symbol=${encodeURIComponent(r.symbol!)}`);
        const sub = subscriptionFrom(c.dataList ?? []);
        if (sub.totalX !== null || sub.riiX !== null) snapshots.push({ company: r.company, snapshotAt: hourFloor(now), ...sub });
      } catch {
        const t = num(currentBySymbol.get(r.symbol!)?.noOfTime);
        if (t !== null) snapshots.push({ company: r.company, snapshotAt: hourFloor(now), qibX: null, niiX: null, riiX: null, totalX: t });
      }
    }
    await sleep(350);
  }
  for (const r of recs.values()) {
    if (r.isBse && r.stage === "open") {
      const t = num(currentBySymbol.get(r.symbol ?? "")?.noOfTime);
      if (t !== null) snapshots.push({ company: r.company, snapshotAt: hourFloor(now), qibX: null, niiX: null, riiX: null, totalX: t });
    }
  }

  /* 3) GMP (sentiment only) ------------------------------------------- */
  const gmpSet: GmpSet = await fetchGmpSources();
  const gmpByCompany = new Map<string, ReturnType<typeof gmpFor>>();
  for (const r of recs.values()) if (r.stage === "open" || r.stage === "sebi_nod") gmpByCompany.set(r.company, gmpFor(gmpSet, r.company, r.symbol, r.priceBandHigh));

  /* 4) DRHP / RHP analysis — once ever, newest pipeline first --------- */
  const analysed = new Map<string, { topRisks: string[]; objects: ReturnType<typeof extractObjects>; cover: DrhpCover }>();
  const watermarks: Record<string, string> = {};
  const todo = [...recs.values()]
    .filter((r) => r.sebiPage && RANK[r.stage] <= RANK.open && !seenDrhp[hashKey(r.company)])
    .sort((a, b) => RANK[b.stage] - RANK[a.stage]); // IPOs nearest to opening first
  let analysedCount = 0;
  let analyseFailures = 0;
  for (const r of todo) {
    if (analysedCount >= DRHP_MAX_PER_RUN || Date.now() > deadline) break;
    try {
      const out = await analyse(r.sebiPage!);
      watermarks[hashKey(r.company)] = out ? "done" : "nothing-extractable"; // parsed once; never fetched again
      if (out) analysed.set(r.company, { topRisks: out.topRisks, objects: out.objects, cover: out.cover });
      analysedCount++;
    } catch {
      analyseFailures++; // transient: retried next run
    }
  }

  /* 5) rows ------------------------------------------------------------ */
  const ipoRows = [...recs.values()].map((r) => {
    const g = gmpByCompany.get(r.company) ?? null;
    const a = analysed.get(r.company);
    return {
      company: r.company,
      symbol: r.symbol,
      series: r.series,
      stage: r.stage,
      issueSize: r.issueSize ?? a?.cover.offer.totalOfferCr ?? null,
      priceBandLow: r.priceBandLow,
      priceBandHigh: r.priceBandHigh,
      lotSize: r.lotSize,
      openDate: r.openDate,
      closeDate: r.closeDate,
      allotmentDate: null,
      listingDate: r.listingDate,
      brlms: r.brlms ?? (a?.cover.brlms.length ? a.cover.brlms : null),
      drhpUrl: r.drhpUrl ?? r.sebiPage,
      topRisks: a?.topRisks ?? null,
      objectsBreakdown: a ? { ...a.objects, offer: a.cover.offer } : null,
      gmpValue: g?.value ?? null,
      gmpPct: g?.pct ?? null,
      gmpLow: g?.low ?? null,
      gmpHigh: g?.high ?? null,
      gmpSources: g?.sources ?? null,
      gmpUpdatedAt: g ? nowIso : null,
      source: r.source,
    };
  });
  const stageLog = [...recs.values()].map((r) => ({ company: r.company, stage: r.stage, seenAt: nowIso }));

  const batches: RecordBatch[] = [
    { table: "ipos", rows: ipoRows, watermarks },
    { table: "ipo_stage_log", rows: stageLog },
    { table: "ipo_subscription_snapshots", rows: snapshots },
  ];
  return [
    {
      id: "ipos_tracked",
      label: "IPOs in the pipeline funnel (DRHP filed → listed)",
      unit: "IPOs",
      category: "market",
      provider: "NSE India / SEBI",
      url: "https://www.nseindia.com/market-data/all-upcoming-issues-ipo",
      obs: [{ date: today(), value: ipoRows.length, meta: { snapshots: snapshots.length, drhpAnalysed: analysedCount, analyseFailures, gmpSources: { chittorgarh: gmpSet.chittorgarh.length, ipowatch: gmpSet.ipowatch.length } } }],
      records: batches,
    },
  ];
}

export const ipos: Collector = { id: ID, run, actionsOnly: true, timeoutMs: BUDGET_MS + 3 * 60_000 };
