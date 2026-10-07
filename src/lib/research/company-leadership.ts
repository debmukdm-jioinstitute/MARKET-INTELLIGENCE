import { extractBrsrPay, filingDateIso, payRatios } from "./brsr-pay.mjs";
import { readCompanyPay, type CompanyPay } from "./company-pay";
export { parseBrsrPay } from "./brsr-pay.mjs";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { hasDatabase, sql } from "@/lib/db";
import { validateSource } from "@/lib/research/transcript-archive";

/**
 * Leadership, pay-disparity, shareholding and dividend snapshot built only from free, public filings:
 * Wikidata (founders / CEO / chair), NSE BRSR (median pay by category), NSE shareholding XBRL (share counts)
 * and NSE corporate actions (dividends). Nothing is estimated silently: derived numbers are labelled as such.
 */

export type Person = { role: "Founder" | "CEO" | "Chair"; name: string; profileUrl: string | null; imageUrl: string | null };
export type PayRow = { category: "Board of Directors" | "Key Managerial Personnel" | "Employees (non-board, non-KMP)" | "Workers"; maleCount: number | null; maleMedian: number | null; femaleCount: number | null; femaleMedian: number | null };
export type Dividend = { exDate: string; perShare: number; subject: string };
export type Holding = { label: string; shares: number; pctOfTotal: number | null; dividendIncomeTtm: number | null };
export type Leadership = {
  symbol: string;
  company: string | null;
  checkedAt: string;
  refreshing?: boolean;
  people: Person[];
  pay: CompanyPay | null;
  dividends: { history: Dividend[]; ttmPerShare: number | null; byYear: { fy: string; perShare: number }[] } | null;
  holdings: { asOf: string | null; totalShares: number; sourceUrl: string; rows: Holding[] } | null;
  annualReportUrl: string | null;
  notes: string[];
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const MAX_BYTES = 30 * 1024 * 1024;
const cache = new Map<string, { value: Leadership; until: number }>();
const pending = new Map<string, Promise<Leadership>>();

export function parseDividends(actions: { subject?: string; exDate?: string }[]): Dividend[] {
  const out: Dividend[] = [];
  for (const a of actions) {
    const subject = a.subject ?? "";
    if (!/dividend/i.test(subject) || /\bnil\b/i.test(subject)) continue;
    const m = /(?:rs\.?|re\.?|inr)\s*([\d]+(?:\.\d+)?)/i.exec(subject);
    const d = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(a.exDate ?? "");
    if (!m || !d) continue;
    const mon = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(d[2].toLowerCase());
    if (mon < 0) continue;
    out.push({ exDate: `${d[3]}-${String(mon + 1).padStart(2, "0")}-${d[1]}`, perShare: Number(m[1]), subject });
  }
  return out.sort((a, b) => b.exDate.localeCompare(a.exDate));
}

const fyOf = (iso: string) => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); const s = m >= 4 ? y : y - 1; return `FY${String(s + 1).slice(2)}`; };

async function wikidata(isin: string, signal?: AbortSignal): Promise<{ company: string | null; people: Person[] }> {
  const query = `SELECT ?coLabel ?prop ?vLabel ?art ?img WHERE { ?co wdt:P946 "${isin}" . VALUES ?prop { wdt:P112 wdt:P169 wdt:P488 } OPTIONAL { ?co ?prop ?v . OPTIONAL { ?art schema:about ?v ; schema:isPartOf <https://en.wikipedia.org/> } OPTIONAL { ?v wdt:P18 ?img } } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { "User-Agent": "MarketIntelligence/1.0 (https://getmarketintelligence.in)", Accept: "application/sparql-results+json" }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  const rows = ((await res.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
  const roles: Record<string, Person["role"]> = { P112: "Founder", P169: "CEO", P488: "Chair" };
  const seen = new Set<string>();
  const people: Person[] = [];
  for (const r of rows) {
    const role = roles[r.prop?.value.split("/").pop() ?? ""];
    const name = r.vLabel?.value;
    if (!role || !name || /^Q\d+$/.test(name) || seen.has(`${role}:${name}`)) continue;
    seen.add(`${role}:${name}`);
    const img = r.img?.value;
    people.push({ role, name, profileUrl: r.art?.value ?? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`, imageUrl: img ? img.replace(/^http:/, "https:") + "?width=96" : null });
  }
  return { company: rows[0]?.coLabel?.value ?? null, people };
}

async function fetchBytes(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  await validateSource(url);
  const res = await fetch(url, { headers: { "User-Agent": UA, Referer: "https://www.nseindia.com/" }, signal: signal ?? AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (Number(res.headers.get("content-length")) > MAX_BYTES) throw new Error("Source too large");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("Source too large");
  return buf;
}

async function fetchRetry(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try { return await fetchBytes(url, signal); } catch (e) { if (signal?.aborted) throw e; last = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}

/** Only a short fallback; the offline batch performs the full scan. */
async function payFromPdf(bytes: Uint8Array) {
  const out = await extractBrsrPay(bytes, { maxPages: 220, timeoutMs: 5000 });
  return out.rows.length >= 2 ? out.rows : null;
}

async function brsrPay(symbol: string, signal?: AbortSignal) {
  const r = await nseJson<{ data?: { attachmentFile?: string; fyFrom?: number; fyTo?: number; submissionDate?: string; revisionDate?: string }[] }>(`/api/corporate-bussiness-sustainabilitiy?index=equities&symbol=${encodeURIComponent(symbol)}`, { signal });
  const files = (r.data ?? []).filter((d) => d.attachmentFile && /\.pdf$/i.test(d.attachmentFile)).sort((a, b) => (b.fyTo ?? 0) - (a.fyTo ?? 0)).slice(0, 2);
  let lastErr: unknown = new Error("No BRSR filing listed");
  // Newest filing first; fall back to the prior year only if the newest file is dead or unreadable (labelled with its FY).
  for (const f of files) {
    try {
      const rows = await payFromPdf(await fetchRetry(f.attachmentFile!, signal));
      if (!rows) { lastErr = new Error("Pay table not found in BRSR"); continue; }
      return { symbol, fy: `FY${String(f.fyTo ?? "").slice(2) || "?"}`, sourceUrl: f.attachmentFile!, rows, ratios: payRatios(rows), status: "ok" as const, extractedBy: "rules" as const, reason: null, filingDate: filingDateIso(f.revisionDate) ?? filingDateIso(f.submissionDate), updatedAt: new Date().toISOString() };
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function boundedLivePay(symbol: string): Promise<CompanyPay | null> {
  // Do not let the legacy live path hold a research request beyond ten seconds.
  // The public page will use batch data on the next request after ingestion.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([brsrPay(symbol, AbortSignal.timeout(10000)), new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 10000); })]); }
  finally { if (timer) clearTimeout(timer); }
}

async function holdingsAndIsin(symbol: string, ttm: number | null, signal?: AbortSignal) {
  const master = await nseJson<{ xbrl?: string; date?: string }[]>(`/api/corporate-share-holdings-master?index=equities&symbol=${encodeURIComponent(symbol)}`, { signal });
  const url = (Array.isArray(master) ? master : []).find((m) => m.xbrl)?.xbrl;
  if (!url) return null;
  const xml = new TextDecoder().decode(await fetchBytes(url, signal));
  const shares = (ctx: string) => { const m = new RegExp(`<in-bse-shp:NumberOfShares contextRef="${ctx}"[^>]*>(\\d+)<`).exec(xml); return m ? Number(m[1]) : null; };
  const total = shares("ShareholdingPattern_ContextI");
  if (!total) return null;
  const wanted: [string, string][] = [
    ["Promoter & promoter group", "ShareholdingOfPromoterAndPromoterGroup_ContextI"],
    ["  of which individuals / HUFs", "IndividualsOrHinduUndividedFamily_ContextI"],
    ["Directors & their relatives (non-promoter)", "DirectorsAndDirectorsRelatives_ContextI"],
    ["Key managerial personnel (non-promoter)", "KeyManagerialPersonnel_ContextI"],
  ];
  const rows: Holding[] = [];
  for (const [label, ctx] of wanted) {
    const n = shares(ctx);
    if (n === null) continue;
    rows.push({ label: label.trim(), shares: n, pctOfTotal: Math.round((n / total) * 10_000) / 100, dividendIncomeTtm: ttm !== null ? Math.round(n * ttm) : null });
  }
  return { asOf: master.find((m) => m.xbrl)?.date ?? null, totalShares: total, sourceUrl: url, rows };
}

async function build(symbol: string, precomputed: CompanyPay | null): Promise<Leadership> {
  const signal = AbortSignal.timeout(25000);
  const notes: string[] = [];
  const out: Leadership = { symbol, company: null, checkedAt: new Date().toISOString(), people: [], pay: null, dividends: null, holdings: null, annualReportUrl: null, notes };
  const actionsP = nseJson<{ subject?: string; exDate?: string; isin?: string; comp?: string }[]>(`/api/corporates-corporateActions?index=equities&symbol=${encodeURIComponent(symbol)}`, { signal }).catch(() => null);
  const arP = nseJson<{ data?: { fileName?: string }[] }>(`/api/annual-reports?index=equities&symbol=${encodeURIComponent(symbol)}`, { signal }).then((r) => r.data?.[0]?.fileName ?? null).catch(() => null);
  let payErr = "";
  const payP = precomputed ? Promise.resolve(precomputed) : boundedLivePay(symbol).catch((e) => { payErr = e instanceof Error ? e.message : String(e); return null; });
  const actions = await actionsP;
  const isin = actions?.find((a) => a.isin)?.isin;
  out.company = actions?.find((a) => a.comp)?.comp ?? null;
  const people = isin ? wikidata(isin, signal).catch(() => null) : Promise.resolve(null);

  let ttm: number | null = null;
  if (actions) {
    const history = parseDividends(actions);
    const cutoff = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    ttm = history.filter((d) => d.exDate >= cutoff).reduce((s, d) => s + d.perShare, 0) || null;
    const byYear = new Map<string, number>();
    for (const d of history) byYear.set(fyOf(d.exDate), (byYear.get(fyOf(d.exDate)) ?? 0) + d.perShare);
    out.dividends = { history: history.slice(0, 12), ttmPerShare: ttm, byYear: [...byYear].slice(0, 8).map(([fy, perShare]) => ({ fy, perShare })).reverse() };
  } else notes.push("Dividend history could not be fetched from NSE just now.");

  const [holdings, pay, ppl, ar] = await Promise.all([holdingsAndIsin(symbol, ttm, signal).catch(() => null), payP, people, arP]);
  out.holdings = holdings;
  out.pay = pay;
  out.annualReportUrl = ar;
  if (ppl) { out.people = ppl.people; out.company = ppl.company ?? out.company; }
  if (!out.people.length) notes.push("Founder/CEO details are not in the open knowledge base (Wikidata) for this company.");
  if (!pay || pay.status !== "ok") notes.push(`Median-pay table not read${payErr ? ` (${payErr.slice(0, 120)})` : ""}. BRSR is mandatory for the top 1,000 listed companies only.`);
  if (!holdings) notes.push("Share-count breakdown from the latest shareholding filing was unavailable.");
  notes.push("Named executive pay and individual share holdings sit in the annual report; open it below. Medians are as reported by the company, not averages.");
  return out;
}

export async function getCompanyLeadership(raw: string, options: { defer?: (task: () => Promise<void>) => void } = {}): Promise<Leadership> {
  const symbol = raw.trim().toUpperCase();
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) throw new Error("Invalid symbol");
  const precomputed = await readCompanyPay(symbol).catch(() => null);
  const overlay = (value: Leadership): Leadership => ({ ...value, pay: precomputed ?? value.pay, notes: precomputed?.status === "ok" ? value.notes.filter((n) => !n.startsWith("Median-pay table not read")) : value.notes });
  const snapshot = (refreshing: boolean): Leadership => ({ symbol, company: null, checkedAt: new Date().toISOString(), refreshing, people: [], pay: precomputed, dividends: null, holdings: null, annualReportUrl: null, notes: [refreshing ? "Other leadership information is being checked." : "Other leadership information could not be checked just now."] });
  const key = `leadership:v3:${symbol}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return overlay(hit.value);
  let job = pending.get(key);
  if (!job && hasDatabase()) {
    // Reuse rollout metadata only when validated batch pay replaces legacy pay.
    const legacyKey = `leadership:v2:${symbol}`;
    const disk = await sql()`SELECT payload FROM transcript_archive_cache WHERE (cache_key = ${key} OR (cache_key = ${legacyKey} AND ${Boolean(precomputed)})) AND expires_at > now() ORDER BY CASE WHEN cache_key = ${key} THEN 0 ELSE 1 END LIMIT 1`.then((rows) => rows[0]?.payload as Leadership | undefined).catch(() => undefined);
    if (disk) { cache.set(key, { value: disk, until: Date.now() + 3600_000 }); return overlay(disk); }
    // Another request may have begun the refresh during the database lookup.
    job = pending.get(key);
  }
  if (!job) {
    job = (async () => {
      try {
        const value = await build(symbol, precomputed);
        const rich = Boolean(value.pay || value.holdings || value.dividends || value.people.length);
        const ttl = value.pay?.status === "ok" ? 3600_000 : rich ? 300_000 : 60_000;
        cache.set(key, { value, until: Date.now() + ttl });
        if (hasDatabase() && rich) await sql()`INSERT INTO transcript_archive_cache (cache_key, payload, expires_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${new Date(Date.now() + ttl).toISOString()}::timestamptz) ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`.catch(() => {});
        return value;
      } catch (error) {
        if (!precomputed) throw error;
        const value = snapshot(false);
        cache.set(key, { value, until: Date.now() + 60_000 });
        return value;
      } finally { pending.delete(key); }
    })();
    pending.set(key, job);
  }
  if (precomputed && options.defer) {
    const refresh = job;
    options.defer(async () => { await refresh; });
    return snapshot(true);
  }
  return overlay(await job);
}
