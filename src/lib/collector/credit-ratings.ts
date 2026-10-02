import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { getText, today } from "./http";
import type { Collector, CollectorContext, RecordBatch, SeriesResult } from "./types";

/**
 * Credit-ratings radar. SEBI-mandated public ratings have no clean bulk API, so
 * this stays thin and honest:
 *  - RetailBonds.in issuer pages (free cross-check aggregator): current rating +
 *    outlook per agency (CRISIL / CARE / ICRA) and the recent rating-action timeline.
 *  - CARE's public rationale list (rrcompany): date + PDF link of each rationale.
 * Hard boundary: rationale PDFs are LINKED, their text is never fetched or stored.
 */

const ID = "credit-ratings";
const MIN_INTERVAL_MS = 6 * 24 * 3600_000; // weekly cadence: rating actions are low-volume
const BUDGET_MS = Number(process.env.CREDIT_RATINGS_BUDGET_MS ?? 12 * 60_000);
const PAUSE_MS = 500;
const ISSUER = (slug: string) => `https://retailbonds.in/issuer/${slug}`;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/* ------------------------------------------------------------------ */
/* 7-notch internal scale                                              */
/* ------------------------------------------------------------------ */

export type Notch = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "D";
export const AGENCIES = ["CRISIL", "CARE", "ICRA"] as const;

/**
 * Per-agency map from the letter band to the internal 7-notch scale. All three
 * Indian agencies share SEBI's symbols for long-term debt; they are kept as
 * separate constants because suffix conventions differ ("CARE AA+", "[ICRA]AA+",
 * "CRISIL AA+") and any future divergence belongs here. C/CC/CCC (below B,
 * "vulnerable") collapse into B; the +/- modifier is preserved in `rating`.
 */
const BAND: Record<string, Notch> = { AAA: "AAA", AA: "AA", A: "A", BBB: "BBB", BB: "BB", B: "B", CCC: "B", CC: "B", C: "B", D: "D" };
export const NOTCH_MAP: Record<(typeof AGENCIES)[number], Record<string, Notch>> = { CRISIL: BAND, CARE: BAND, ICRA: BAND };

/** "CRISIL AA+", "[ICRA]AA+ (CE)", "CARE BBB-" → { rating: "AA+", notch: "AA" }. Short-term (A1+, A2) and unparseable → nulls. */
export function normalizeRating(raw: string | null | undefined, agency: (typeof AGENCIES)[number]): { rating: string | null; notch: Notch | null } {
  const s = (raw ?? "")
    .replace(/\[?\b(CRISIL|CARE|ICRA|IND|ACUITE|IVR)\b\]?/gi, "")
    .replace(/\((?:CE|SO|IS)\)/gi, "")
    .trim()
    .toUpperCase();
  const m = /^(AAA|AA|A|BBB|BB|B|CCC|CC|C|D)\s*([+-])?(?![0-9A-Z])/.exec(s);
  if (!m) return { rating: null, notch: null };
  return { rating: `${m[1]}${m[2] ?? ""}`, notch: NOTCH_MAP[agency][m[1]] ?? null };
}

/* ------------------------------------------------------------------ */
/* Issuer-page parsing                                                 */
/* ------------------------------------------------------------------ */

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** "Reliance Industries Ltd." → "reliance-industries-limited" (RetailBonds issuer slug convention). */
export function issuerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bltd\b\.?/g, "limited")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/ /g, "-");
}

export type ActionKind = "upgrade" | "downgrade" | "reaffirmation" | "initial" | "update" | "watch" | "withdrawn" | "not-cooperating";
export const classifyAction = (label: string): ActionKind => {
  const l = label.toLowerCase();
  if (/upgrad/.test(l)) return "upgrade";
  if (/downgrad/.test(l)) return "downgrade";
  if (/reaffirm/.test(l)) return "reaffirmation";
  if (/not cooperat|non.?cooperat/.test(l)) return "not-cooperating";
  if (/withdraw/.test(l)) return "withdrawn";
  if (/watch/.test(l)) return "watch";
  if (/initial|assign/.test(l)) return "initial";
  return "update";
};

/** Split "Watch Negative" / "Negative" / "Stable" → outlook vs credit-watch columns. */
export function splitOutlook(raw: string): { outlook: string | null; watch: string | null } {
  const t = raw.trim();
  if (!t || t === "—" || t === "-") return { outlook: null, watch: null };
  const w = /watch(?:\s+with)?\s+(negative|positive|developing)/i.exec(t);
  if (w) return { outlook: null, watch: w[1].toLowerCase() };
  const o = /(stable|positive|negative|developing)/i.exec(t);
  return { outlook: o ? o[1].toLowerCase() : null, watch: null };
}

export type IssuerParse = {
  agencies: { agency: string; rating: string; outlook: string; bonds: number }[];
  actions: { date: string; agency: string; rating: string; label: string; outlook: string }[];
};

export function parseIssuerPage(html: string): IssuerParse {
  const agencies: IssuerParse["agencies"] = [];
  const table = /<thead><tr><th>Agency<\/th><th>Rating<\/th><th>Outlook<\/th><th>Bonds<\/th><\/tr><\/thead>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? "";
  for (const row of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => decode(c[1]));
    if (cells.length >= 3) agencies.push({ agency: cells[0], rating: cells[1], outlook: cells[2], bonds: Number((cells[3] ?? "0").replace(/,/g, "")) || 0 });
  }
  const actions: IssuerParse["actions"] = [];
  for (const m of html.matchAll(/<div class="rating-timeline-item">([\s\S]*?)<div class="rating-timeline-outlook">([\s\S]*?)<\/div>\s*<\/div>/g)) {
    const head = /rating-timeline-date">\s*(\d{4}-\d{2}-\d{2})\s*·\s*([^<]+)</.exec(m[1]);
    const rating = /rating-timeline-rating">([\s\S]*?)<\/div>/.exec(m[1])?.[1];
    if (!head) continue;
    const out = decode(m[2]); // "Initial · Stable" | "Update"
    const [label, ...rest] = out.split("·").map((x) => x.trim());
    actions.push({ date: head[1], agency: head[2].trim(), rating: decode(rating ?? ""), label: label ?? "", outlook: rest.join(" ") });
  }
  return { agencies, actions };
}

export type RatingRow = {
  symbol: string;
  agency: string;
  rating: string | null;
  notch: Notch | null;
  outlook: string | null;
  watch: string | null;
  action: string;
  actionDate: string;
  rationaleUrl: string | null;
  source: string;
};

const agencyKey = (a: string): (typeof AGENCIES)[number] | null => {
  const u = a.trim().toUpperCase();
  return (AGENCIES as readonly string[]).includes(u) ? (u as (typeof AGENCIES)[number]) : null;
};

/** Parsed page → rows. Snapshot rows (action "current") carry today's date; action rows keep the agency's own date. */
export function issuerToRows(symbol: string, parsed: IssuerParse, issuerUrl: string, asOf: string, prevSnapshots: Record<string, string> = {}): { rows: RatingRow[]; snapshotKeys: Record<string, string> } {
  const rows: RatingRow[] = [];
  const snapshotKeys: Record<string, string> = {};
  // An agency can rate several instrument types differently (e.g. senior vs AT1 bonds); the issuer-level
  // snapshot uses the rating covering the most bonds, so one odd instrument never defines the company.
  const primary = new Map<(typeof AGENCIES)[number], IssuerParse["agencies"][number]>();
  for (const a of parsed.agencies) {
    const ag = agencyKey(a.agency);
    const cur = ag ? primary.get(ag) : undefined;
    if (ag && (!cur || a.bonds > cur.bonds)) primary.set(ag, a);
  }
  for (const [ag, a] of primary) {
    const { rating, notch } = normalizeRating(a.rating, ag);
    if (!rating) continue; // unrated / short-term only: no row, the UI shows "not covered"
    const { outlook, watch } = splitOutlook(a.outlook);
    const sig = `${rating}|${outlook ?? ""}|${watch ?? ""}`;
    const key = `ratings:${symbol}:${ag}`;
    if (prevSnapshots[key] === sig) continue; // unchanged since the last stored snapshot
    snapshotKeys[key] = sig;
    rows.push({ symbol, agency: ag, rating, notch, outlook, watch, action: "current", actionDate: asOf, rationaleUrl: issuerUrl, source: "RETAILBONDS_SNAPSHOT" });
  }
  for (const act of parsed.actions) {
    const ag = agencyKey(act.agency);
    if (!ag) continue;
    const { rating, notch } = normalizeRating(act.rating, ag);
    const { outlook, watch } = splitOutlook(act.outlook);
    rows.push({ symbol, agency: ag, rating, notch, outlook, watch, action: classifyAction(act.label), actionDate: act.date, rationaleUrl: issuerUrl, source: "RETAILBONDS" });
  }
  return { rows, snapshotKeys };
}

/* ------------------------------------------------------------------ */
/* CARE rationale list (date + PDF link only)                          */
/* ------------------------------------------------------------------ */

type CareItem = { CompanyName?: string; FileURL?: string; PublishedDate?: string };
const careNorm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/\b(limited|ltd)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function careRationaleRows(symbol: string, companyName: string, items: CareItem[]): RatingRow[] {
  const want = careNorm(companyName);
  const out: RatingRow[] = [];
  const cutoff = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10); // last 12 months only
  for (const it of items) {
    if (!it.CompanyName || !it.FileURL || !it.PublishedDate || careNorm(it.CompanyName) !== want) continue;
    const date = it.PublishedDate.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < cutoff) continue;
    out.push({ symbol, agency: "CARE", rating: null, notch: null, outlook: null, watch: null, action: "rationale", actionDate: date, rationaleUrl: `https://www.careratings.com/upload/CompanyFiles/PR/${encodeURIComponent(it.FileURL)}`, source: "CARE" });
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const force = process.env.CREDIT_RATINGS_FORCE === "1";
  const lastRun = await ctx?.watermark("lastrun:credit-ratings").catch(() => null);
  if (!force && lastRun && Date.now() - Date.parse(lastRun) < MIN_INTERVAL_MS) {
    // Weekly guard: nothing to do, and that is a success, not a failure.
    return [{ id: "credit_ratings_rows", label: "Credit-rating rows collected this run", unit: "rows", category: "market", provider: "RetailBonds / CARE", url: "https://retailbonds.in/ratings", obs: [{ date: today(), value: 0, meta: { skipped: "ran <6 days ago", lastRun } }] }];
  }

  const snaps: Record<string, string> = (await ctx?.watermarks("ratings:").catch(() => ({}))) ?? {};
  const only = (process.env.CREDIT_RATINGS_SYMBOLS ?? "").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
  const universe = NIFTY_500.filter((r) => !only.length || only.includes(r[0]));
  const cursor = only.length ? 0 : Number((await ctx?.watermark("credit-ratings:cursor").catch(() => null)) ?? 0) || 0;

  const deadline = Date.now() + BUDGET_MS;
  const rows: RatingRow[] = [];
  const watermarks: Record<string, string> = {};
  let covered = 0;
  let fetchFailures = 0;
  let reachable = 0;
  let i = 0;
  for (; i < universe.length && Date.now() < deadline; i++) {
    const [symbol, name] = universe[(cursor + i) % universe.length];
    const url = ISSUER(issuerSlug(name));
    let html: string | null = null;
    try {
      html = await getText(url, { headers: HEADERS, timeoutMs: 20_000, attempts: 2 });
      reachable++;
    } catch (e) {
      // 404 = RetailBonds does not track this issuer (not covered); anything else counts as a transient failure.
      if (/HTTP 404/.test(String(e))) reachable++;
      else fetchFailures++;
    }
    await sleep(PAUSE_MS);
    if (!html) continue;
    const parsed = parseIssuerPage(html);
    if (!parsed.agencies.length && !parsed.actions.length) continue;
    covered++;
    const { rows: r, snapshotKeys } = issuerToRows(symbol, parsed, url, today(), snaps);
    rows.push(...r);
    Object.assign(watermarks, snapshotKeys);
    try {
      const careRes = await getText(`https://www.careratings.com/rrcompany?companyName=${encodeURIComponent(name.replace(/\s*Ltd\.?$/i, "").slice(0, 40))}&YearID=&fdate=&tdate=`, {
        headers: { ...HEADERS, "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
        timeoutMs: 20_000,
        attempts: 1,
      });
      const j = JSON.parse(careRes) as { data?: CareItem[] | number };
      if (Array.isArray(j.data)) rows.push(...careRationaleRows(symbol, name, j.data));
    } catch {
      /* CARE list is best-effort enrichment */
    }
    await sleep(PAUSE_MS);
  }

  if (universe.length && reachable === 0) throw new Error(`RetailBonds unreachable (${fetchFailures} fetch failures)`);

  const finished = i >= universe.length;
  if (!only.length) {
    watermarks["credit-ratings:cursor"] = String(finished ? 0 : (cursor + i) % universe.length);
    if (finished) watermarks["lastrun:credit-ratings"] = new Date().toISOString();
  }

  const batch: RecordBatch = { table: "credit_ratings", rows: rows as unknown as Record<string, unknown>[], watermarks };
  return [{ id: "credit_ratings_rows", label: "Credit-rating rows collected this run", unit: "rows", category: "market", provider: "RetailBonds / CARE", url: "https://retailbonds.in/ratings", obs: [{ date: today(), value: rows.length, meta: { covered, processed: i, fetchFailures, finished } }], records: batch }];
}

export const creditRatings: Collector = { id: ID, run, actionsOnly: true, timeoutMs: BUDGET_MS + 120_000 };
